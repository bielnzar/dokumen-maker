import easyocr
import os
from PIL import Image
import numpy as np
from pdf2image import convert_from_path

def extract_text_with_easyocr(pdf_path, output_path):
    """Extract text from PDF using EasyOCR"""
    print(f"Processing: {pdf_path}")

    # Initialize reader (Indonesian + English)
    reader = easyocr.Reader(['id', 'en'], gpu=True)

    # Convert PDF to images
    images = convert_from_path(pdf_path, dpi=300)

    full_text = ''
    for page_num, image in enumerate(images, start=1):
        print(f"  OCR page {page_num}/{len(images)}...")

        # Convert PIL image to numpy array
        image_array = np.array(image)

        # Extract text
        results = reader.readtext(image_array)

        # Format results
        page_text = ''
        for (bbox, text, confidence) in results:
            if confidence > 0.5:  # Filter low confidence
                page_text += text + '\n'

        full_text += f"--- PAGE {page_num} ---\n{page_text}\n\n"

    # Save to file
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(full_text)

    print(f"Extracted: {output_path}")

def extract_all_pdfs():
    """Extract all PDFs using EasyOCR"""

    folders_to_process = ['docs/RKS', 'docs/RAB', 'docs/LHP']

    for folder in folders_to_process:
        if os.path.exists(folder):
            folder_name = os.path.basename(folder)
            print(f"\n{'='*50}")
            print(f"Processing {folder_name} files from: {folder}")
            print(f"{'='*50}")

            for filename in os.listdir(folder):
                if filename.endswith('.pdf'):
                    pdf_path = os.path.join(folder, filename)
                    output_name = filename.replace('.pdf', '_easyocr.txt')
                    output_path = os.path.join('extracted', folder_name, output_name)
                    os.makedirs(os.path.dirname(output_path), exist_ok=True)

                    try:
                        extract_text_with_easyocr(pdf_path, output_path)
                    except Exception as e:
                        print(f"Error processing {filename}: {e}")
        else:
            print(f"\nFolder not found: {folder}")

if __name__ == '__main__':
    extract_all_pdfs()
    print("\nEasyOCR extraction complete!")
