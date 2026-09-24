from typing import Dict
import threading

class ProgressManager:
    """Track OCR progress for active uploads"""

    def __init__(self):
        self._progress: Dict[str, Dict] = {}
        self._lock = threading.Lock()

    def start_upload(self, file_id: str, total_pages: int):
        """Initialize progress tracking for a file"""
        with self._lock:
            self._progress[file_id] = {
                "current_page": 0,
                "total_pages": total_pages,
                "status": "processing",
                "message": "Starting OCR...",
                "phase": "ocr"
            }

    def update_progress(self, file_id: str, current_page: int, total_pages: int, message: str = ""):
        """Update progress for a file"""
        with self._lock:
            if file_id in self._progress:
                self._progress[file_id].update({
                    "current_page": current_page,
                    "total_pages": total_pages,
                    "message": message or f"Processing page {current_page}/{total_pages}"
                })

    def complete_upload(self, file_id: str, success: bool = True, error: str = None):
        """Mark upload as complete"""
        with self._lock:
            if file_id in self._progress:
                self._progress[file_id].update({
                    "status": "completed" if success else "error",
                    "message": "Completed!" if success else (error or "Failed"),
                    "current_page": self._progress[file_id]["total_pages"]
                })

    def start_ai_phase(self, file_id: str):
        """Transition from OCR to AI extraction phase"""
        with self._lock:
            if file_id in self._progress:
                self._progress[file_id].update({
                    "phase": "ai",
                    "message": "Extracting data with AI...",
                    "status": "processing",
                    "ai_text": "",  # Initialize AI text accumulator
                    "ai_progress": 0  # AI progress percentage (0-100)
                })

    def update_ai_progress(self, file_id: str, progress_percent: int):
        """Update AI extraction progress (0-100)"""
        with self._lock:
            if file_id in self._progress:
                self._progress[file_id]["ai_progress"] = min(100, max(0, progress_percent))

    def update_ai_chunk(self, file_id: str, chunk: str):
        """Update AI streaming text chunk"""
        with self._lock:
            if file_id in self._progress:
                current_text = self._progress[file_id].get("ai_text", "")
                self._progress[file_id]["ai_text"] = current_text + chunk

    def get_progress(self, file_id: str) -> Dict:
        """Get current progress for a file"""
        with self._lock:
            return self._progress.get(file_id, {
                "current_page": 0,
                "total_pages": 100,
                "status": "unknown",
                "message": "Not found"
            })

    def cleanup(self, file_id: str):
        """Remove progress tracking after completion"""
        with self._lock:
            self._progress.pop(file_id, None)


# Global instance
progress_manager = ProgressManager()
