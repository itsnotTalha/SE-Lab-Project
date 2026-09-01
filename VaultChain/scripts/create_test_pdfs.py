from pathlib import Path
from reportlab.pdfgen import canvas

OUTPUT = Path(__file__).resolve().parent


def create_pdf(path: Path, lines):
    pdf = canvas.Canvas(str(path))
    pdf.setFont('Helvetica', 12)
    y = 760
    for line in lines:
        pdf.drawString(72, y, line)
        y -= 22
    pdf.save()


create_pdf(OUTPUT / 'original-test.pdf', [
    'VaultChain document verification test.',
    'Owner: test user.',
    'Reference content remains unchanged.',
])
create_pdf(OUTPUT / 'modified-test.pdf', [
    'VaultChain document verification test.',
    'Owner: test user.',
    'Reference content was changed in this copy.',
])
