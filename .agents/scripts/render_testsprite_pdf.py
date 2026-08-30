from pathlib import Path
import fitz

pdf_path = Path("attached_assets/TestSprite_1788066991818.pdf")
output_dir = Path(".agents/outputs/testsprite-report")
output_dir.mkdir(parents=True, exist_ok=True)

doc = fitz.open(pdf_path)
text_path = output_dir / "pages.txt"

with text_path.open("w", encoding="utf-8") as text_file:
    text_file.write(f"pages={doc.page_count}\n")
    for index, page in enumerate(doc):
        page_number = index + 1
        text_file.write(f"\n===== PAGE {page_number} =====\n")
        text_file.write(page.get_text("text"))

        # A readable render for visual verification and evidence review.
        pixmap = page.get_pixmap(matrix=fitz.Matrix(1.35, 1.35), alpha=False)
        pixmap.save(output_dir / f"page-{page_number:03d}.png")

print(f"Rendered {doc.page_count} pages to {output_dir}")
print(f"Extracted page text to {text_path}")