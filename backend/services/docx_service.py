from docx import Document
from docx.shared import Pt, Inches
from docx.enum.text import WD_PARAGRAPH_ALIGNMENT
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime
from utils.config import Config
from utils.logger import setup_logger
from num2words import num2words

logger = setup_logger("docx_service")

class DOCXService:
    def __init__(self):
        self.templates_dir = Path(Config.TEMPLATES_DIR)

    def load_template(self, doc_type: str, template_type: str) -> Document:
        """Load DOCX template"""
        template_path = self.templates_dir / f"{template_type}_{doc_type.lower()}.docx"

        if not template_path.exists():
            # Try alternative naming
            template_path = self.templates_dir / f"{doc_type}_{template_type}.docx"

        if not template_path.exists():
            raise FileNotFoundError(f"Template not found: {template_path}")

        doc = Document(str(template_path))
        return doc

    def add_items_table(self, doc: Document, items: List[Dict], table_title: str = '', placeholder: str = None) -> 'docx.table.Table':
        """Add items table with actual DOCX table structure

        Args:
            doc: Document object
            items: List of item dictionaries
            table_title: Optional title for the table
            placeholder: If provided, find this placeholder and insert table there instead of at end

        Returns:
            The created table object
        """
        if not items:
            logger.warning("No items to add to table")
            return

        # Find insertion point if placeholder specified
        placeholder_paragraph = None

        if placeholder:
            for paragraph in doc.paragraphs:
                if placeholder in paragraph.text:
                    placeholder_paragraph = paragraph
                    logger.info(f"Found placeholder '{placeholder}'")
                    break

        # Create table using python-docx API (6 columns: NO, URAIAN, VOLUME, SATUAN, HARGA SATUAN, JUMLAH HARGA)
        table = doc.add_table(rows=1, cols=6)
        table.style = 'Table Grid'

        # Set table width to auto for autofit to CONTENT (not page width)
        from docx.oxml.shared import OxmlElement, qn
        tbl_w = OxmlElement('w:tblW')
        tbl_w.set(qn('w:type'), 'auto')
        tbl_w.set(qn('w:w'), '0')
        table._element.tblPr.append(tbl_w)

        # Enable autofit for table
        table.autofit = True

        # Remove fixed column widths to allow autofit to work
        for column in table.columns:
            column.width = None

        # Add headers
        headers = ['NO', 'URAIAN', 'VOLUME', 'SATUAN', 'HARGA SATUAN', 'JUMLAH HARGA']
        header_cells = table.rows[0].cells
        for i, header in enumerate(headers):
            header_cells[i].text = header
            for paragraph in header_cells[i].paragraphs:
                paragraph.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
                paragraph.paragraph_format.line_spacing = 1.0
                for run in paragraph.runs:
                    run.bold = False

        # Header cantSplit and repeat across pages
        header_tr = table.rows[0]._tr.get_or_add_trPr()
        header_tr.append(OxmlElement('w:tblHeader'))
        header_tr.append(OxmlElement('w:cantSplit'))

        # Add data rows
        for idx, item in enumerate(items, start=1):
            row_cells = table.add_row().cells

            # NO
            row_cells[0].text = str(item.get('NO', idx))
            row_cells[0].paragraphs[0].alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
            row_cells[0].paragraphs[0].paragraph_format.line_spacing = 1.0

            # URAIAN
            uraian = item.get('uraian', item.get('name', item.get('Deskripsi', item.get('URAIAN', ''))))
            row_cells[1].text = str(uraian)
            for paragraph in row_cells[1].paragraphs:
                paragraph.paragraph_format.line_spacing = 1.0

            # VOLUME
            volume = item.get('volume', item.get('quantity', item.get('Volume', item.get('VOLUME', ''))))
            row_cells[2].text = str(volume)
            row_cells[2].paragraphs[0].alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
            row_cells[2].paragraphs[0].paragraph_format.line_spacing = 1.0

            # SATUAN
            satuan = item.get('satuan', item.get('unit', item.get('Satuan', item.get('SATUAN', ''))))
            row_cells[3].text = str(satuan)
            row_cells[3].paragraphs[0].alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
            row_cells[3].paragraphs[0].paragraph_format.line_spacing = 1.0

            # HARGA SATUAN
            harga = item.get('harga_satuan', item.get('price', item.get('Harga', item.get('HARGA', ''))))
            try:
                harga_val = float(harga) if harga else 0
                harga_text = f"Rp {int(harga_val):,}".replace(',', '.') if harga_val > 0 else '-'
            except (ValueError, TypeError):
                harga_text = str(harga) if harga else '-'
            row_cells[4].text = harga_text
            row_cells[4].paragraphs[0].alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
            row_cells[4].paragraphs[0].paragraph_format.line_spacing = 1.0

            # JUMLAH HARGA (volume * harga_satuan)
            try:
                vol = float(item.get('volume', 0)) if item.get('volume') else 0
                sat = float(item.get('harga_satuan', 0)) if item.get('harga_satuan') else 0
                jumlah = vol * sat
                jumlah_text = f"Rp {int(jumlah):,}".replace(',', '.') if jumlah > 0 else '-'
            except (ValueError, TypeError):
                jumlah_text = '-'
            row_cells[5].text = jumlah_text
            row_cells[5].paragraphs[0].alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
            row_cells[5].paragraphs[0].paragraph_format.line_spacing = 1.0

            # Prevent row from splitting across pages
            row_tr = table.rows[-1]._tr.get_or_add_trPr()
            row_tr.append(OxmlElement('w:cantSplit'))

        # Move table to placeholder position if specified
        if placeholder_paragraph:
            # Get table element
            table_element = table._element

            # Insert table element after placeholder paragraph
            placeholder_paragraph._element.addnext(table_element)

            # Clear placeholder text but keep paragraph
            placeholder_paragraph.text = ""
            logger.info(f"Moved table to placeholder position")
        else:
            logger.info("Appended table to end of document")

        return table

    def add_items_table_no_price(self, doc: Document, items: List[Dict], table_title: str = '', placeholder: str = None) -> 'docx.table.Table':
        """Add items table WITHOUT price columns (for RKS Pasal 3)

        Args:
            doc: Document object
            items: List of item dictionaries
            table_title: Optional title for the table
            placeholder: If provided, find this placeholder and insert table there instead of at end

        Returns:
            The created table object
        """
        if not items:
            logger.warning("No items to add to table")
            return

        # Find insertion point if placeholder specified
        placeholder_paragraph = None

        if placeholder:
            for paragraph in doc.paragraphs:
                if placeholder in paragraph.text:
                    placeholder_paragraph = paragraph
                    logger.info(f"Found placeholder '{placeholder}'")
                    break

        # Create table using python-docx API (4 columns, no price)
        table = doc.add_table(rows=1, cols=4)
        table.style = 'Table Grid'
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        table.autofit = False

        # Set standard column widths (Sum: 1.0 + 11.0 + 2.5 + 2.5 = 17.0 cm)
        col_widths = [
            Inches(1.0 / 2.54),
            Inches(11.0 / 2.54),
            Inches(2.5 / 2.54),
            Inches(2.5 / 2.54),
        ]

        # Add cell padding (margins) for clean spacing
        tblPr = table._element.xpath('w:tblPr')
        if tblPr:
            cell_margins = parse_xml(
                f'<w:tblCellMar {nsdecls("w")}>\n'
                f'  <w:top w:w="120" w:type="dxa"/>\n'
                f'  <w:left w:w="160" w:type="dxa"/>\n'
                f'  <w:bottom w:w="120" w:type="dxa"/>\n'
                f'  <w:right w:w="160" w:type="dxa"/>\n'
                f'</w:tblCellMar>'
            )
            tblPr[0].append(cell_margins)

        # Add headers (no HARGA SATUAN)
        headers = ['NO', 'URAIAN', 'VOLUME', 'SATUAN']
        header_cells = table.rows[0].cells
        for i, header in enumerate(headers):
            header_cells[i].text = header
            header_cells[i].width = col_widths[i]
            # Add light corporate header background
            shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="F2F4F7"/>')
            header_cells[i]._tc.get_or_add_tcPr().append(shading)
            for paragraph in header_cells[i].paragraphs:
                paragraph.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
                paragraph.paragraph_format.line_spacing = 1.0
                paragraph.paragraph_format.space_before = Pt(3)
                paragraph.paragraph_format.space_after = Pt(3)
                for run in paragraph.runs:
                    run.bold = True
                    run.font.name = 'Times New Roman'
                    run.font.size = Pt(11)

        header_tr = table.rows[0]._tr.get_or_add_trPr()
        header_tr.append(OxmlElement('w:tblHeader'))
        header_tr.append(OxmlElement('w:cantSplit'))

        # Add data rows (only 4 columns)
        for idx, item in enumerate(items, start=1):
            row_cells = table.add_row().cells

            # Apply column widths
            for i in range(4):
                row_cells[i].width = col_widths[i]

            # NO
            row_cells[0].text = str(item.get('NO', idx))
            p0 = row_cells[0].paragraphs[0]
            p0.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
            p0.paragraph_format.line_spacing = 1.15
            p0.paragraph_format.space_before = Pt(2)
            p0.paragraph_format.space_after = Pt(2)
            for r in p0.runs:
                r.font.name = 'Times New Roman'
                r.font.size = Pt(11)

            # URAIAN
            uraian = item.get('uraian', item.get('name', item.get('Deskripsi', item.get('URAIAN', ''))))
            row_cells[1].text = str(uraian)
            p1 = row_cells[1].paragraphs[0]
            p1.alignment = WD_PARAGRAPH_ALIGNMENT.LEFT
            p1.paragraph_format.line_spacing = 1.15
            p1.paragraph_format.space_before = Pt(2)
            p1.paragraph_format.space_after = Pt(2)
            for r in p1.runs:
                r.font.name = 'Times New Roman'
                r.font.size = Pt(11)

            # VOLUME
            volume = item.get('volume', item.get('quantity', item.get('Volume', item.get('VOLUME', ''))))
            row_cells[2].text = str(volume)
            p2 = row_cells[2].paragraphs[0]
            p2.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
            p2.paragraph_format.line_spacing = 1.15
            p2.paragraph_format.space_before = Pt(2)
            p2.paragraph_format.space_after = Pt(2)
            for r in p2.runs:
                r.font.name = 'Times New Roman'
                r.font.size = Pt(11)

            # SATUAN
            satuan = item.get('satuan', item.get('unit', item.get('Satuan', item.get('SATUAN', ''))))
            row_cells[3].text = str(satuan)
            p3 = row_cells[3].paragraphs[0]
            p3.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
            p3.paragraph_format.line_spacing = 1.15
            p3.paragraph_format.space_before = Pt(2)
            p3.paragraph_format.space_after = Pt(2)
            for r in p3.runs:
                r.font.name = 'Times New Roman'
                r.font.size = Pt(11)

            # Prevent row from splitting across pages
            row_tr = table.rows[-1]._tr.get_or_add_trPr()
            row_tr.append(OxmlElement('w:cantSplit'))

        # Move table to placeholder position if specified
        if placeholder_paragraph:
            # Get table element
            table_element = table._element

            # Insert table element after placeholder paragraph
            placeholder_paragraph._element.addnext(table_element)

            # Clear placeholder text but keep paragraph
            placeholder_paragraph.text = ""
            logger.info(f"Moved table to placeholder position")
        else:
            logger.info("Appended table to end of document")
        logger.info(f"Added table with {len(items)} rows")
        return table

    def add_summary_table(self, doc: Document, table: 'docx.table.Table', ppn_percent: int = 11) -> None:
        """Add summary rows (Total, PPN, Grand Total) to the items table

        Args:
            doc: Document object
            table: The items table to add summary to
            ppn_percent: PPN percentage (default 11%)
        """
        # Calculate total from existing rows
        total = 0
        for row in table.rows[1:]:  # Skip header row
            try:
                # Jumlah Harga is in column 5 (0-indexed), after NO|URAIAN|VOLUME|SATUAN|HARGA SATUAN|JUMLAH HARGA
                jumlah_text = row.cells[5].text.strip()
                if jumlah_text and jumlah_text != '-':
                    # Remove non-numeric characters (dots, commas, spaces, 'Rp', etc)
                    jumlah_clean = ''.join(c for c in jumlah_text if c.isdigit())
                    if jumlah_clean:
                        total += int(jumlah_clean)
            except (ValueError, IndexError):
                continue

        # Calculate PPN and Grand Total
        ppn = int(total * ppn_percent / 100)
        grand_total = total + ppn

        # Add Total row (merge cells 0-4, place total in cell 5)
        total_row = table.add_row()
        total_row.cells[0].merge(total_row.cells[4])  # Merge first 5 cells (NO through HARGA SATUAN)
        total_row.cells[0].text = "Total"
        total_row.cells[0].paragraphs[0].alignment = WD_PARAGRAPH_ALIGNMENT.RIGHT
        total_row.cells[0].paragraphs[0].runs[0].bold = True
        total_row.cells[5].text = f"Rp {total:,}".replace(',', '.')
        total_row.cells[5].paragraphs[0].alignment = WD_PARAGRAPH_ALIGNMENT.CENTER

        # Add PPN row
        ppn_row = table.add_row()
        ppn_row.cells[0].merge(ppn_row.cells[4])
        ppn_row.cells[0].text = f"PPN ({ppn_percent}%)"
        ppn_row.cells[0].paragraphs[0].alignment = WD_PARAGRAPH_ALIGNMENT.RIGHT
        ppn_row.cells[0].paragraphs[0].runs[0].bold = True
        ppn_row.cells[5].text = f"Rp {ppn:,}".replace(',', '.')
        ppn_row.cells[5].paragraphs[0].alignment = WD_PARAGRAPH_ALIGNMENT.CENTER

        # Add Grand Total row
        grand_row = table.add_row()
        grand_row.cells[0].merge(grand_row.cells[4])
        grand_row.cells[0].text = "Grand Total"
        grand_row.cells[0].paragraphs[0].alignment = WD_PARAGRAPH_ALIGNMENT.RIGHT
        grand_row.cells[0].paragraphs[0].runs[0].bold = True
        grand_row.cells[5].text = f"Rp {grand_total:,}".replace(',', '.')
        grand_row.cells[5].paragraphs[0].alignment = WD_PARAGRAPH_ALIGNMENT.CENTER

        # Prevent summary rows from splitting across pages
        from docx.oxml import OxmlElement
        for r in [total_row, ppn_row, grand_row]:
            r_tr = r._tr.get_or_add_trPr()
            r_tr.append(OxmlElement('w:cantSplit'))

        logger.info(f"Added summary: Total={total}, PPN={ppn}, Grand Total={grand_total}")

    def replace_placeholders(self, doc: Document, replacements: Dict[str, Any], list_placeholders: List[str] = None) -> None:
        """Replace placeholders in document while preserving formatting

        Args:
            doc: Document object
            replacements: Dict of placeholder names to values (strings or lists)
            list_placeholders: List of placeholder keys that should be formatted as numbered lists
        """
        if list_placeholders is None:
            list_placeholders = []

        logger.info(f"Replacing placeholders: {list(replacements.keys())}")
        logger.info(f"List placeholders: {list_placeholders}")
        replaced_count = 0

        # Handle list-type placeholders first
        for list_key in list_placeholders:
            if list_key in replacements:
                placeholder = f"{{{{{list_key}}}}}"
                value = replacements[list_key]

                if isinstance(value, list):
                    self.insert_numbered_list(doc, value, placeholder)
                    replaced_count += 1
                else:
                    logger.warning(f"List placeholder '{list_key}' received non-list value: {type(value)}")

        # Handle normal text placeholders (skip list placeholders)
        for paragraph in doc.paragraphs:
            for key, value in replacements.items():
                if key in list_placeholders:
                    continue  # Already handled

                placeholder = f"{{{{{key}}}}}"
                if placeholder in paragraph.text:
                    self._replace_text_in_paragraph(paragraph, placeholder, str(value))
                    logger.info(f"Replaced placeholder: {placeholder}")
                    replaced_count += 1

        # Also check tables for normal placeholders
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for paragraph in cell.paragraphs:
                        for key, value in replacements.items():
                            if key in list_placeholders:
                                continue  # Already handled

                            placeholder = f"{{{{{key}}}}}"
                            if placeholder in paragraph.text:
                                self._replace_text_in_paragraph(paragraph, placeholder, str(value))
                                logger.info(f"Replaced placeholder in table: {placeholder}")
                                replaced_count += 1

        logger.info(f"Total placeholders replaced: {replaced_count}")

    def _replace_text_in_paragraph(self, paragraph, old_text, new_text):
        """Replace text in paragraph while preserving formatting"""
        for run in paragraph.runs:
            if old_text in run.text:
                run.text = run.text.replace(old_text, new_text)

    def fill_template(self, doc: Document, data: Dict[str, Any], list_placeholders: List[str] = None) -> Document:
        """Fill template with extracted data

        Args:
            doc: Document object
            data: Dict of placeholder names to values
            list_placeholders: List of keys that should be formatted as numbered lists
        """
        if list_placeholders is None:
            list_placeholders = []

        # Convert all values to strings except list placeholders
        replacements = {}
        for key, value in data.items():
            if key in list_placeholders:
                # Keep as-is (should be list)
                replacements[key] = value
            else:
                # Convert to string, None -> empty string
                replacements[key] = str(value) if value is not None else ""

        self.replace_placeholders(doc, replacements, list_placeholders)

        # Pagination optimization: prevent orphan headings and glue captions to content
        for p in doc.paragraphs:
            text_clean = p.text.strip()
            if (text_clean.startswith('PASAL ') or 
                text_clean.startswith('Pasal ') or 
                text_clean.startswith('Tabel ') or 
                text_clean.startswith('RENCANA ') or
                text_clean.startswith('LEMBAR ') or
                p.style.name.startswith('Heading')):
                p.paragraph_format.keep_with_next = True

        return doc


    def save_document(self, doc: Document, output_path: str) -> None:
        """Save document to file"""
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        logger.info(f"Saving document to: {output_path}")
        doc.save(str(output_path))

    def docx_to_html(self, doc: Document) -> str:
        """Convert docx Document to HTML string using mammoth"""
        from mammoth import convert_to_html
        from bs4 import BeautifulSoup

        # Save docx to bytes for mammoth
        from io import BytesIO
        docx_bytes = BytesIO()
        doc.save(docx_bytes)
        docx_bytes.seek(0)

        # Convert to HTML
        result = convert_to_html(docx_bytes)

        # Post-process: center headings and titles, right-align dates, justify body
        soup = BeautifulSoup(result.value, 'html.parser')
        for p in soup.find_all('p'):
            text = p.get_text().strip()
            # Center only genuine headings / titles
            if any(text.startswith(h) for h in ['RENCANA ', 'PASAL ', 'Pasal ']) or (p.find('strong') and len(text) < 70 and not any(text.startswith(x) for x in ['1.', '2.', '3.', '4.', '5.', 'a.', 'b.', 'c.'])):
                p['style'] = 'text-align: center; font-weight: bold; margin: 12px 0'
            # Right-align "Dikeluarkan di" and "Tanggal" paragraphs
            elif text.startswith("Dikeluarkan di") or text.startswith("Tanggal:"):
                p['style'] = 'text-align: right'

        # Post-process signature tables so they render borderless in preview
        for tbl in soup.find_all('table'):
            tbl_text = tbl.get_text()
            if 'Pemberi Tugas' in tbl_text or 'Penyedia Barang' in tbl_text:
                tbl['style'] = 'border: none !important; width: 100%; margin-top: 24px; margin-bottom: 24px;'
                for td in tbl.find_all(['td', 'th']):
                    td['style'] = 'border: none !important; text-align: center; vertical-align: top; padding: 12px;'

        # Wrap with CSS for proper table styling
        styled_html = f"""
        <style>
            .rks-preview {{ font-family: 'Times New Roman', serif; font-size: 12pt; margin: 0 1cm; padding: 0; }}
            .rks-preview table {{ border-collapse: collapse; width: 100%; margin: 16px 0; }}
            .rks-preview td, .rks-preview th {{ border: 1px solid #333; padding: 8px; vertical-align: top; }}
            .rks-preview th {{ background-color: #f0f0f0; text-align: center; }}
            .rks-preview td {{ text-align: left; }}
            .rks-preview h1, .rks-preview h2, .rks-preview h3 {{ text-align: center; margin: 0; }}
            .rks-preview p {{ margin: 0; text-align: justify; }}
            .rks-preview p[style*='text-align: center'] {{ text-align: center !important; }}
            .rks-preview .item-name {{ text-align: left !important; }}
            .rks-preview .item-qty {{ text-align: center !important; }}
            .rks-preview ol, .rks-preview ul {{ margin: 0; padding-left: 24px; }}
        </style>
        <div class="rks-preview">
        {str(soup)}
        </div>
        """
        return styled_html

    def _create_fresh_num_id(self, doc: Document) -> Optional[int]:
        """Allocate a fresh numId in doc's numbering part so that a numbered list restarts at 1"""
        try:
            from docx.oxml import OxmlElement
            from docx.oxml.ns import qn

            numbering_part = getattr(doc.part, 'numbering_part', None)
            if numbering_part is None:
                return None

            numbering_element = numbering_part._element

            # Collect existing numIds
            existing_ids = []
            for num in numbering_element.findall(qn('w:num')):
                val = num.attrib.get(qn('w:numId'))
                if val and val.isdigit():
                    existing_ids.append(int(val))

            new_num_id = (max(existing_ids) + 1) if existing_ids else 100

            # Find standard decimal abstractNumId (7 in our RKS template, or any decimal)
            target_abstract_id = "7"
            abstract_nums = numbering_element.findall(qn('w:abstractNum'))
            found = False
            for abs_num in abstract_nums:
                abs_id = abs_num.attrib.get(qn('w:abstractNumId'))
                if abs_id == target_abstract_id:
                    found = True
                    break

            if not found and abstract_nums:
                for abs_num in abstract_nums:
                    lvl = abs_num.find(qn('w:lvl'))
                    if lvl is not None:
                        num_fmt = lvl.find(qn('w:numFmt'))
                        if num_fmt is not None and num_fmt.attrib.get(qn('w:val')) == 'decimal':
                            target_abstract_id = abs_num.attrib.get(qn('w:abstractNumId'))
                            found = True
                            break
                if not found:
                    target_abstract_id = abstract_nums[0].attrib.get(qn('w:abstractNumId'), "0")

            # Create new w:num
            num_elem = OxmlElement('w:num')
            num_elem.set(qn('w:numId'), str(new_num_id))
            abs_elem = OxmlElement('w:abstractNumId')
            abs_elem.set(qn('w:val'), str(target_abstract_id))
            num_elem.append(abs_elem)

            # Force LibreOffice / Word to restart numbering at 1
            lvl_override = OxmlElement('w:lvlOverride')
            lvl_override.set(qn('w:ilvl'), '0')
            start_override = OxmlElement('w:startOverride')
            start_override.set(qn('w:val'), '1')
            lvl_override.append(start_override)
            num_elem.append(lvl_override)

            numbering_element.append(num_elem)

            return new_num_id
        except Exception as e:
            logger.warning(f"Could not create fresh numId: {e}")
            return None

    def insert_numbered_list(self, doc: Document, activities: List[str], placeholder: str) -> None:
        """Insert work activities as Word numbered list at placeholder position

        Args:
            doc: Document object
            activities: List of activity strings (no manual numbering)
            placeholder: Placeholder text to find (e.g., "{{pasal2_content}}")

        Behavior:
            - Finds paragraph containing placeholder
            - Inserts each activity as separate paragraph with "List Number" style
            - Deletes placeholder paragraph
            - Allocates fresh numId so the list strictly restarts at 1
            - Falls back to manual numbering if "List Number" style missing
        """
        if not activities:
            logger.warning("No activities to insert")
            return

        # Find placeholder paragraph
        placeholder_paragraph = None
        for paragraph in doc.paragraphs:
            if placeholder in paragraph.text:
                placeholder_paragraph = paragraph
                logger.info(f"Found placeholder '{placeholder}'")
                break

        if not placeholder_paragraph:
            logger.warning(f"Placeholder '{placeholder}' not found")
            return

        # Check if "List Number" style exists
        style_name = "List Number"
        style_exists = any(s.name == style_name for s in doc.styles)

        # Allocate fresh numId so this list strictly restarts at 1
        fresh_num_id = self._create_fresh_num_id(doc)

        # Get placeholder position (insertion point)
        placeholder_element = placeholder_paragraph._element

        # Store placeholder formatting for copying
        placeholder_alignment = placeholder_paragraph.alignment
        placeholder_paragraph_format = placeholder_paragraph.paragraph_format

        # Get font from placeholder (use first run if available)
        placeholder_font = None
        if placeholder_paragraph.runs:
            placeholder_font = placeholder_paragraph.runs[0].font

        # Track insertion point to maintain order
        last_element = placeholder_element

        # Insert each activity as numbered paragraph
        for idx, activity in enumerate(activities, start=1):
            if not activity.strip():
                continue

            # Create new paragraph
            new_para = doc.add_paragraph(activity)

            # Copy placeholder formatting
            new_para.alignment = placeholder_alignment

            # Copy paragraph format (line spacing, etc.)
            if placeholder_paragraph_format:
                new_para.paragraph_format.line_spacing = placeholder_paragraph_format.line_spacing
                new_para.paragraph_format.space_before = placeholder_paragraph_format.space_before
                new_para.paragraph_format.space_after = placeholder_paragraph_format.space_after

            # Copy font formatting
            if placeholder_font and new_para.runs:
                new_font = new_para.runs[0].font
                new_font.name = placeholder_font.name
                new_font.size = placeholder_font.size
                new_font.bold = placeholder_font.bold
                new_font.italic = placeholder_font.italic

            # Apply numbering style or fallback
            if style_exists:
                try:
                    new_para.style = style_name
                except Exception as e:
                    logger.warning(f"Failed to apply style: {e}, using manual numbering")
                    new_para.text = f"{idx}. {activity}"
            else:
                # Manual numbering fallback
                new_para.text = f"{idx}. {activity}"
                logger.warning(f"Style '{style_name}' not found, using manual numbering")

            # Attach fresh numId so every list strictly restarts from 1
            if fresh_num_id is not None:
                from docx.oxml import OxmlElement
                from docx.oxml.ns import qn
                pPr = new_para._p.get_or_add_pPr()
                for np in pPr.findall(qn('w:numPr')):
                    pPr.remove(np)
                numPr = OxmlElement('w:numPr')
                ilvl = OxmlElement('w:ilvl')
                ilvl.set(qn('w:val'), '0')
                numId_elem = OxmlElement('w:numId')
                numId_elem.set(qn('w:val'), str(fresh_num_id))
                numPr.append(ilvl)
                numPr.append(numId_elem)
                pPr.append(numPr)

            # Move paragraph to correct position (after last inserted)
            new_para_element = new_para._element
            last_element.addnext(new_para_element)
            last_element = new_para_element

        # Remove placeholder paragraph
        placeholder_paragraph.text = ""
        logger.info(f"Inserted {len(activities)} activities as numbered list")

    def generate_nodin(self, data: Dict[str, Any], output_filename: str) -> str:
        """Generate NODIN DOCX from template

        Args:
            data: Dict with project_name, kepada, dari, items, scope_description, work_type, computed_subtotal
            output_filename: Output filename

        Returns:
            Generated filename
        """
        from strategies.nodin_strategy import NodinStrategy

        strategy = NodinStrategy()

        # Load nodin template directly (nodin.docx in templates dir)
        template_path = Path(Config.TEMPLATES_DIR) / "nodin.docx"
        doc = Document(str(template_path))

        # Generate butir 1
        butir_1 = strategy.format_butir_1(
            data.get("items", []),
            {
                "scope_description": data.get("scope_description", ""),
                "work_type": data.get("work_type", "")
            }
        )

        # Compute values for butir 2
        total = data.get("computed_subtotal", 0)
        total_fmt = self._format_number(total)
        total_terbilang = num2words(total, lang='id')
        tahun = datetime.now().year

        # Build replacement data - include ALL placeholders
        replacements = {
            "project_name": data.get("project_name", ""),
            "kepada": data.get("kepada", ""),
            "dari": data.get("dari", ""),
            "butir_1": butir_1,
            "butir_2": f"2. Tersebut butir 1 (satu) di atas, mohon persetujuan untuk {data.get('project_name', '')} dengan harga sebesar IDR {total_fmt} ({total_terbilang}) belum termasuk PPN menggunakan Pos Mata Anggaran Pemeliharaan Tahun {tahun} (RAB Terlampir).",
            "butir_3": "3. Demikian disampaikan untuk analisis lebih lanjut dan terima kasih atas persetujuannya.",
            "tanggal": datetime.now().strftime("%d %B %Y"),
            "total_amount": total_fmt,
            "total_terbilang": total_terbilang,
            "tahun": str(tahun),
        }

        # Use existing fill_template method
        doc = self.fill_template(doc, replacements)

        # Save
        output_path = Path(Config.OUTPUT_DIR) / output_filename
        output_path.parent.mkdir(parents=True, exist_ok=True)
        doc.save(str(output_path))
        logger.info(f"Generated NODIN: {output_path}")
        return output_filename

    def _build_butir_2(self, data: Dict[str, Any]) -> str:
        total = data.get("computed_subtotal", 0)
        total_fmt = self._format_number(total)
        total_terbilang = num2words(total, lang='id')

        butir_2 = (
            f"2. Tersebut butir 1 (satu) di atas, mohon persetujuan untuk "
            f"{data.get('project_name', '')} "
            f"dengan harga sebesar IDR {total_fmt} ({total_terbilang}) belum termasuk "
            f"PPN menggunakan Pos Mata Anggaran Pemeliharaan Tahun {datetime.now().year} "
            f"(RAB Terlampir)."
        )
        return butir_2

    def _format_number(self, num: float) -> str:
        """Format 100000 to 100.000"""
        return f"{num:,.0f}".replace(",", ".")

    def _fill_placeholder(self, doc: Document, key: str, value: str) -> Document:
        """Replace single placeholder in document"""
        placeholder = f"{{{{{key}}}}}"
        for paragraph in doc.paragraphs:
            if placeholder in paragraph.text:
                self._replace_text_in_paragraph(paragraph, placeholder, str(value))
                logger.info(f"Replaced {placeholder}")
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for paragraph in cell.paragraphs:
                        if placeholder in paragraph.text:
                            self._replace_text_in_paragraph(paragraph, placeholder, str(value))
        return doc

