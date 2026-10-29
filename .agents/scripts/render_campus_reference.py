import pymupdf

source = "attached_assets/SJSU-main-campus-map_1790567769866.pdf"
document = pymupdf.open(source)
page = document[0]
print("pages:", document.page_count, "page points:", page.rect)
clip = pymupdf.Rect(430, 680, 2360, 2750)
pixmap = page.get_pixmap(matrix=pymupdf.Matrix(1.35, 1.35), clip=clip, alpha=False)
pixmap.save("artifacts/campus-safety-heat-map/public/sjsu-illustrated-campus.png")
print("map crop:", clip, "render size:", pixmap.width, pixmap.height)