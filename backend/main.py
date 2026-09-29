from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel
from pathlib import Path
from typing import Optional
import shutil
import uuid
import json
import threading
import asyncio

from services.ocr_service import OCRService
from services.extraction_service import ExtractionService
from services.docx_service import DOCXService
from utils.config import Config
from utils.logger import setup_logger
from utils.progress import progress_manager
from strategies import StrategyFactory
from services.excel_service import ExcelService
from services.pdf_service import PDFService
import mimetypes

logger = setup_logger("api")

app = FastAPI(title="RAB/RKS Generator API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://172.19.154.216:5173",
        "http://172.19.154.216:3000",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|.*\.vercel\.app|.*\.trycloudflare\.com|.*\.ngrok-free\.[a-z]+|.*\.ngrok\.[a-z]+|172\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Upload directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Output directory
OUTPUT_DIR = Path(Config.OUTPUT_DIR)
OUTPUT_DIR.mkdir(exist_ok=True)


# Store results in memory (in production, use Redis or database)
_extraction_results: dict = {}
_regenerating_files: set = set()  # Track files currently being regenerated



def process_pdf_background(file_id: str, file_path: Path):
    """Background task to process PDF with progress updates"""
    try:
        logger.info(f"[Background] Task started for {file_id}")
        ocr_service = OCRService()
        def progress_callback(current_page: int, total_pages: int, message: str):
            progress_manager.update_progress(file_id, current_page, total_pages, message)
        # OCR extraction with progress
        logger.info(f"[Background] Starting OCR for {file_id}")
        lhp_text = ocr_service.extract_text(str(file_path), progress_callback=progress_callback)
        logger.info(f"[Background] OCR completed, {len(lhp_text)} chars")

        # Start AI extraction
        progress_manager.start_ai_phase(file_id)
        logger.info(f"[Background] Starting AI extraction for {file_id}")

        # Detect document type and extract
        extraction_service = ExtractionService()
        logger.info(f"[Background] Detecting document type...")
        doc_type = extraction_service.detect_document_type(lhp_text)
        logger.info(f"[Background] Document type detected: {doc_type}")

        logger.info(f"[Background] Calling Gemini API for structured extraction...")

        # Create progress callback for AI streaming and progress
        def ai_progress_callback(chunk: str):
            progress_manager.update_ai_chunk(file_id, chunk)

        # Update AI progress milestones
        progress_manager.update_ai_progress(file_id, 10)  # Starting extraction

        # Create AI progress callback for milestones
        def ai_milestone_callback(progress_percent: int):
            progress_manager.update_ai_progress(file_id, progress_percent)

        extracted_data = extraction_service.extract_structured_data(
            lhp_text, doc_type,
            progress_callback=ai_progress_callback,
            ai_progress_callback=ai_milestone_callback
        )
        progress_manager.update_ai_progress(file_id, 100)  # Extraction complete
        logger.info(f"[Background] AI extraction completed, got {len(extracted_data.get('items', []))} items")

        # Store result
        _extraction_results[file_id] = {
            "lhp_text": lhp_text,
            "extracted_data": extracted_data,
            "document_type": doc_type
        }

        # Mark complete
        progress_manager.complete_upload(file_id, success=True)

        # Clean up uploaded file
        file_path.unlink()

    except Exception as e:
        logger.error(f"[Background] Processing error: {e}")
        progress_manager.complete_upload(file_id, success=False, error=str(e))
        file_path.unlink()

    

async def progress_stream(file_id: str):
    """SSE stream for progress updates"""
    try:
        progress = progress_manager.get_progress(file_id)
        yield f"data: {json.dumps(progress)}\n\n"

        while True:
            progress = progress_manager.get_progress(file_id)
            yield f"data: {json.dumps(progress)}\n\n"

            # If completed or error, stop streaming
            if progress["status"] in ["completed", "error"]:
                # Send final state twice to ensure it's received
                yield f"data: {json.dumps(progress)}\n\n"
                await asyncio.sleep(0.2)
                yield "data: [DONE]\n\n"
                await asyncio.sleep(0.2)
                break

            await asyncio.sleep(0.5)

    except asyncio.CancelledError:
        pass  # Stream cancelled


@app.get("/")
async def root():
    return {"message": "RAB/RKS Generator API", "version": "1.0.0"}


@app.get("/health")
@app.get("/api/health")
async def health():
    return {
        "status": "healthy",
        "ai_model": Config.GEMINI_MODEL,
        "ai_configured": bool(Config.GEMINI_API_KEY),
        "app_title": Config.APP_TITLE,
        "version": Config.APP_VERSION,
    }


@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """Upload PDF and start background processing"""
    try:
        # Save uploaded file
        file_id = str(uuid.uuid4())
        file_path = UPLOAD_DIR / f"{file_id}.pdf"

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        logger.info(f"Uploaded file: {file.filename} -> {file_path}")

        # Initialize progress
        progress_manager.start_upload(file_id, total_pages=1)

        # Start background processing in thread
        thread = threading.Thread(target=process_pdf_background, args=(file_id, file_path))
        thread.daemon = True
        thread.start()

        # Return immediately
        return {
            "file_id": file_id,
            "message": "Processing started"
        }

    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/upload/progress/{file_id}")
async def upload_progress(file_id: str):
    """SSE endpoint for real-time OCR progress"""
    return StreamingResponse(
        progress_stream(file_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
        }
    )


@app.post("/api/upload/result/{file_id}")
async def get_upload_result(file_id: str):
    """Get extraction result after processing completes"""
    if file_id not in _extraction_results:
        raise HTTPException(status_code=404, detail="Result not found or processing incomplete")

    result = _extraction_results[file_id]

    # Cleanup
    progress_manager.cleanup(file_id)

    return {
        "file_id": file_id,
        **result
    }


def _format_timeline(timeline_raw: str) -> str:
    """Format and clean timeline string for RKS Pasal 6, avoiding duplicate phrases"""
    raw = (timeline_raw or "").strip()
    if not raw:
        return "30 (tiga puluh) hari kalender sejak Purchase Order (PO) atau Surat Perintah Kerja diterbitkan"

    import re
    if "sejak" in raw.lower():
        parts = re.split(r'\bsejak\b', raw, flags=re.IGNORECASE)
        if len(parts) > 2:
            raw = parts[0].strip() + " sejak " + parts[1].strip()
        return raw.rstrip(".")
    else:
        return f"{raw} sejak Purchase Order (PO) atau Surat Perintah Kerja diterbitkan"


@app.post("/api/preview")
async def preview_documents(data: dict):
    """Generate preview HTML for RAB and RKS documents"""
    try:
        doc_type = data.get("document_type", "PENGADAAN")
        strategy = StrategyFactory.create(doc_type)

        from datetime import datetime

        template_data = {
            "project_name": data.get("project_name", ""),
            "timeline": _format_timeline(data.get("timeline", "")),
            "work_type": data.get("work_type", ""),
            "date": datetime.now().strftime("%d %B %Y"),
        }

        template_data["work_activities"] = data.get("work_activities", [])

        termin_count = data.get("termin_count", 1)
        if termin_count and termin_count > 0 and not data.get("payment_terms"):
            percentage_per_termin = 100 / termin_count
            payment_terms = {}
            for i in range(1, termin_count + 1):
                payment_terms[f"termin_{i}_percent"] = f"{percentage_per_termin:.1f}"
                payment_terms[f"termin_{i}_condition"] = ""
            data["payment_terms"] = payment_terms

        payment_content = strategy.format_payment_content(data)
        if payment_content:
            template_data["pasal10_content"] = payment_content

        docx_service = DOCXService()
        result = {}

        # Generate RAB preview
        try:
            rab_base = strategy.get_template_name("RAB")
            rab_doc = docx_service.load_template(rab_base, "RAB")

            items_with_numbers = [{**item, 'NO': i} for i, item in enumerate(data.get("items", []), 1)]
            rab_table = docx_service.add_items_table(rab_doc, items_with_numbers, placeholder="{{items_table}}")
            docx_service.add_summary_table(rab_doc, rab_table, ppn_percent=11)

            template_data_for_rab = {k: v for k, v in template_data.items() if k != "rab_items_table"}
            list_placeholders = ["work_activities", "pasal10_content"]
            rab_doc = docx_service.fill_template(rab_doc, template_data_for_rab, list_placeholders=list_placeholders)

            result["rab"] = docx_service.docx_to_html(rab_doc)
            logger.info(f"Generated RAB preview HTML, length: {len(result['rab'])}")
        except Exception as e:
            logger.error(f"RAB preview error: {e}")
            result["rab"] = f"<html><body><p>Error generating RAB preview: {e}</p></body></html>"

        # Generate RKS preview
        try:
            rks_base = strategy.get_template_name("RKS")
            rks_doc = docx_service.load_template(rks_base, "RKS")

            items_with_numbers = [{**item, 'NO': i} for i, item in enumerate(data.get("items", []), 1)]
            rks_table = docx_service.add_items_table_no_price(rks_doc, items_with_numbers, placeholder="{{pasal3_table}}")

            list_placeholders = ["work_activities", "pasal10_content"]
            rks_doc = docx_service.fill_template(rks_doc, template_data, list_placeholders=list_placeholders)

            result["rks"] = docx_service.docx_to_html(rks_doc)
            logger.info(f"Generated RKS preview HTML, length: {len(result['rks'])}")
        except Exception as e:
            logger.error(f"RKS preview error: {e}")
            result["rks"] = f"<html><body><p>Error generating RKS preview: {e}</p></body></html>"

        return result

    except Exception as e:
        logger.error(f"Preview error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate")
async def generate_documents(data: dict):
    """Generate RAB and RKS documents"""
    try:
        doc_type = data.get("document_type", "PENGADAAN")
        strategy = StrategyFactory.create(doc_type)

        # Format template data
        from datetime import datetime

        template_data = {
            "project_name": data.get("project_name", ""),
            "timeline": _format_timeline(data.get("timeline", "")),
            "work_type": data.get("work_type", ""),
            "date": datetime.now().strftime("%d %B %Y"),
        }

        # Pass work_activities as array for numbered list formatting
        template_data["work_activities"] = data.get("work_activities", [])

        # Transform termin_count to payment_termins if payment_terms not already provided
        termin_count = data.get("termin_count", 1)
        if termin_count and termin_count > 0 and not data.get("payment_terms"):
            percentage_per_termin = 100 / termin_count

            payment_terms = {}
            for i in range(1, termin_count + 1):
                payment_terms[f"termin_{i}_percent"] = f"{percentage_per_termin:.1f}"
                payment_terms[f"termin_{i}_condition"] = ""

            data["payment_terms"] = payment_terms
            logger.info(f"Generated {termin_count} payment termins with {percentage_per_termin:.1f}% each")

        # Use strategy for Pasal 10
        payment_content = strategy.format_payment_content(data)
        if payment_content:
            template_data["pasal10_content"] = payment_content

        docx_service = DOCXService()
        generated_files = {}

        # Generate RAB DOCX (commented out - boss says XLSX sufficient)
        # try:
        #     rab_base = strategy.get_template_name("RAB")
        #     rab_doc = docx_service.load_template(rab_base, "RAB")
        #
        #     # Add items table
        #     items_with_numbers = [{**item, 'NO': i} for i, item in enumerate(data.get("items", []), 1)]
        #     rab_table = docx_service.add_items_table(rab_doc, items_with_numbers, placeholder="{{items_table}}")
        #     docx_service.add_summary_table(rab_doc, rab_table, ppn_percent=11)
        #
        #     # Fill template
        #     template_data_for_rab = {k: v for k, v in template_data.items() if k != "rab_items_table"}
        #     list_placeholders = ["work_activities", "pasal10_content"]
        #     rab_doc = docx_service.fill_template(rab_doc, template_data_for_rab, list_placeholders=list_placeholders)
        #
        #     rab_path = OUTPUT_DIR / f"RAB_{data.get('project_name', 'project').replace(' ', '_')}_{uuid.uuid4().hex[:8]}.docx"
        #     docx_service.save_document(rab_doc, str(rab_path))
        #     generated_files["rab"] = rab_path.name
        #
        #     logger.info(f"Generated RAB: {rab_path}")
        # except FileNotFoundError as e:
        #     logger.warning(f"RAB template not found: {e}")

        # Generate RAB XLSX
        try:
            items_with_numbers = [{**item, 'NO': i} for i, item in enumerate(data.get("items", []), 1)]
            excel_service = ExcelService()
            xlsx_path = OUTPUT_DIR / f"RAB_{data.get('project_name', 'project').replace(' ', '_')}_{uuid.uuid4().hex[:8]}.xlsx"
            wb = excel_service.create_workbook()
            excel_service.add_items_table(wb, items_with_numbers)
            excel_service.save_workbook(wb, str(xlsx_path))
            generated_files["rab_xlsx"] = xlsx_path.name
            logger.info(f"Generated RAB XLSX: {xlsx_path}")
        except Exception as e:
            logger.error(f"XLSX generation error: {e}")

        # Generate RKS
        try:
            rks_base = strategy.get_template_name("RKS")
            rks_doc = docx_service.load_template(rks_base, "RKS")
            logger.info(f"[DEBUG] RKS document loaded: {rks_doc is not None}")

            # Add items table without price for Pasal 3
            items_with_numbers = [{**item, 'NO': i} for i, item in enumerate(data.get("items", []), 1)]
            rks_table = docx_service.add_items_table_no_price(rks_doc, items_with_numbers, placeholder="{{pasal3_table}}")

            # Fill template
            list_placeholders = ["work_activities", "pasal10_content"]
            rks_doc = docx_service.fill_template(rks_doc, template_data, list_placeholders=list_placeholders)

            rks_path = OUTPUT_DIR / f"RKS_{data.get('project_name', 'project').replace(' ', '_')}_{uuid.uuid4().hex[:8]}.docx"
            docx_service.save_document(rks_doc, str(rks_path))
            generated_files["rks"] = rks_path.name

            logger.info(f"Generated RKS: {rks_path}")
        except FileNotFoundError as e:
            logger.warning(f"RKS template not found: {e}")

        # Conditional NODIN generation - RAB subtotal < 300M
        nodin_filename = None
        try:
            # Compute subtotal from items with harga_satuan
            subtotal = 0
            for item in data.get("items", []):
                vol = float(item.get("volume", 0) or 0)
                harga = float(item.get("harga_satuan", 0) or 0)
                subtotal += vol * harga

            logger.info(f"[NODIN] Computed RAB subtotal: {subtotal}")

            if subtotal < 300_000_000:
                nodin_data = {
                    "project_name": data.get("project_name", ""),
                    "kepada": data.get("kepada", ""),
                    "dari": data.get("dari", ""),
                    "scope_description": data.get("scope_description", ""),
                    "work_type": data.get("work_type", ""),
                    "items": data.get("items", []),
                    "computed_subtotal": subtotal
                }
                nodin_filename = f"NODIN_{data.get('project_name', 'project').replace(' ', '_')}_{uuid.uuid4().hex[:8]}.docx"
                docx_service.generate_nodin(nodin_data, nodin_filename)
                generated_files["nodin"] = nodin_filename
                logger.info(f"[NODIN] Generated: {nodin_filename} (subtotal {subtotal} < 300M)")
            else:
                logger.info(f"[NODIN] Skipped: subtotal {subtotal} >= 300M")
        except Exception as e:
            logger.error(f"NODIN generation error: {e}")

        # Convert generated documents to PDF if PDFService is available
        try:
            pdf_service = PDFService()
            if pdf_service.is_available():
                # RKS DOCX -> PDF
                if "rks" in generated_files:
                    rks_docx_path = OUTPUT_DIR / generated_files["rks"]
                    rks_pdf_path = pdf_service.convert_to_pdf(rks_docx_path, OUTPUT_DIR)
                    if rks_pdf_path:
                        generated_files["rks_pdf"] = rks_pdf_path.name
                        logger.info(f"Generated RKS PDF: {rks_pdf_path.name}")

                # RAB XLSX -> PDF
                if "rab_xlsx" in generated_files:
                    rab_xlsx_path = OUTPUT_DIR / generated_files["rab_xlsx"]
                    rab_pdf_path = pdf_service.convert_to_pdf(rab_xlsx_path, OUTPUT_DIR)
                    if rab_pdf_path:
                        generated_files["rab_pdf"] = rab_pdf_path.name
                        logger.info(f"Generated RAB PDF: {rab_pdf_path.name}")

                # NODIN DOCX -> PDF
                if "nodin" in generated_files:
                    nodin_docx_path = OUTPUT_DIR / generated_files["nodin"]
                    nodin_pdf_path = pdf_service.convert_to_pdf(nodin_docx_path, OUTPUT_DIR)
                    if nodin_pdf_path:
                        generated_files["nodin_pdf"] = nodin_pdf_path.name
                        logger.info(f"Generated NODIN PDF: {nodin_pdf_path.name}")
        except Exception as e:
            logger.error(f"PDF generation error: {e}")

        return {
            "success": True,
            "files": generated_files,
            "document_type": doc_type
        }

    except Exception as e:
        logger.error(f"Generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/download/{filename}")
async def download_file(filename: str):
    """Download generated document"""
    file_path = OUTPUT_DIR / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    media_type, _ = mimetypes.guess_type(str(file_path))
    if not media_type:
        media_type = "application/octet-stream"

    from fastapi.responses import FileResponse
    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=filename
    )


@app.get("/api/document-types")
async def get_document_types():
    """Get supported document types"""
    return {
        "document_types": Config.DOC_TYPES,
        "default": "PENGADAAN"
    }


class RegeneratePasal2Request(BaseModel):
    file_id: str
    lhp_text: str
    document_type: str
    custom_pasal2_prompt: Optional[str] = None
    jumlah_kegiatan: Optional[int] = None


@app.post("/api/regenerate-pasal2")
async def regenerate_pasal2(data: RegeneratePasal2Request):
    """Regenerate only Pasal 2 (work activities) section"""
    # Idempotency: prevent double request
    if data.file_id in _regenerating_files:
        raise HTTPException(status_code=409, detail="Regeneration already in progress")

    try:
        _regenerating_files.add(data.file_id)
        extraction_service = ExtractionService()
        work_activities = extraction_service.regenerate_pasal2(
            lhp_text=data.lhp_text,
            doc_type=data.document_type,
            custom_prompt=data.custom_pasal2_prompt,
            jumlah_kegiatan=data.jumlah_kegiatan
        )
        return {"work_activities": work_activities}
    except Exception as e:
        logger.error(f"Regenerate Pasal 2 error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        _regenerating_files.discard(data.file_id)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8090)
