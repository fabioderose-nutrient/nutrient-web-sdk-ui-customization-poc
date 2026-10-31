"""Generate the two fictitious sample PDFs used by the playground.

- public/documents/field-service-handbook.pdf: an 8-page handbook with headings,
  a document outline (bookmarks), body text and a table.
- public/documents/service-request-form.pdf: a one-page AcroForm with text fields,
  check boxes, radio buttons, a drop-down list and a signature field.

Every company, person, address and product in these files is invented.

Usage:
    pip install -r samples/requirements.txt
    python samples/generate_samples.py
"""

from pathlib import Path

from pypdf import PdfReader, PdfWriter
from pypdf.generic import (
    ArrayObject,
    DictionaryObject,
    FloatObject,
    NameObject,
    NumberObject,
    TextStringObject,
)
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "public" / "documents"

COMPANY = "Larkfield Instruments Ltd"
PRODUCT = "Tarnwell LX-200"

INK = colors.HexColor("#1f2933")
MUTED = colors.HexColor("#52606d")
RULE = colors.HexColor("#cbd2d9")
ACCENT = colors.HexColor("#2f6f8f")


# --------------------------------------------------------------------------
# Handbook
# --------------------------------------------------------------------------

styles = getSampleStyleSheet()
BODY = ParagraphStyle(
    "Body", parent=styles["BodyText"], fontName="Helvetica", fontSize=10.5,
    leading=15, textColor=INK, spaceAfter=7, alignment=TA_LEFT,
)
H1 = ParagraphStyle(
    "H1", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=20,
    leading=24, textColor=INK, spaceBefore=4, spaceAfter=10,
)
H2 = ParagraphStyle(
    "H2", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=13,
    leading=17, textColor=ACCENT, spaceBefore=10, spaceAfter=5,
)
SMALL = ParagraphStyle("Small", parent=BODY, fontSize=9, leading=12, textColor=MUTED)
CELL = ParagraphStyle("Cell", parent=BODY, fontSize=9.5, leading=12.5, spaceAfter=0)
CELL_HEAD = ParagraphStyle("CellHead", parent=CELL, fontName="Helvetica-Bold", textColor=colors.white)


class Heading(Paragraph):
    """A paragraph that becomes an entry in the PDF outline."""

    def __init__(self, text, style, level):
        super().__init__(text, style)
        self.outline_level = level
        self.outline_text = text


class HandbookTemplate(BaseDocTemplate):
    def __init__(self, filename):
        super().__init__(
            filename, pagesize=A4, leftMargin=22 * mm, rightMargin=22 * mm,
            topMargin=24 * mm, bottomMargin=22 * mm,
            title=f"{PRODUCT} Field Service Handbook", author=COMPANY,
            subject="Fictitious sample document", creator="generate_samples.py",
        )
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id="body")
        self.addPageTemplates([PageTemplate(id="page", frames=[frame], onPage=self.decorate)])
        self.heading_count = 0

    def decorate(self, canv, doc):
        canv.saveState()
        width, height = A4
        canv.setStrokeColor(RULE)
        canv.setLineWidth(0.6)
        canv.line(22 * mm, height - 16 * mm, width - 22 * mm, height - 16 * mm)
        canv.setFont("Helvetica", 8.5)
        canv.setFillColor(MUTED)
        canv.drawString(22 * mm, height - 13 * mm, f"{PRODUCT} Field Service Handbook")
        canv.drawRightString(width - 22 * mm, height - 13 * mm, COMPANY)
        canv.line(22 * mm, 15 * mm, width - 22 * mm, 15 * mm)
        canv.drawString(22 * mm, 10 * mm, "Revision 3.1. Fictitious sample document for demonstration only.")
        canv.drawRightString(width - 22 * mm, 10 * mm, f"Page {doc.page}")
        canv.restoreState()

    def afterFlowable(self, flowable):
        if isinstance(flowable, Heading):
            self.heading_count += 1
            key = f"h{self.heading_count}"
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(flowable.outline_text, key, level=flowable.outline_level, closed=False)


def h1(text):
    return Heading(text, H1, 0)


def h2(text):
    return Heading(text, H2, 1)


def p(text):
    return Paragraph(text, BODY)


def table(rows, widths):
    data = [[Paragraph(c, CELL_HEAD) for c in rows[0]]]
    data += [[Paragraph(c, CELL) for c in row] for row in rows[1:]]
    t = Table(data, colWidths=widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), ACCENT),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f4f8")]),
        ("GRID", (0, 0), (-1, -1), 0.5, RULE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return t


def build_handbook(path):
    doc = HandbookTemplate(str(path))
    s = []

    # Page 1: cover and introduction
    s.append(Spacer(1, 30 * mm))
    s.append(Paragraph(f"{PRODUCT}", ParagraphStyle("Cover", parent=H1, fontSize=30, leading=36)))
    s.append(Paragraph("Field Service Handbook", ParagraphStyle("CoverSub", parent=H1, fontSize=18, textColor=ACCENT)))
    s.append(Spacer(1, 6 * mm))
    s.append(p(f"Published by {COMPANY}, 14 Harrow Mill Lane, Larkfield, LF3 9QA."))
    s.append(p("This handbook explains how field engineers install, calibrate and maintain the "
               f"{PRODUCT} water quality monitor. It is written for trained service staff and for "
               "site operators who assist them."))
    s.append(Spacer(1, 8 * mm))
    s.append(h1("1. Introduction"))
    s.append(p(f"The {PRODUCT} measures pH, conductivity, dissolved oxygen and turbidity in open "
               "channels and treatment tanks. Readings are logged every minute and sent to the site "
               "gateway over a wired or wireless link."))
    s.append(p("Each chapter starts with the tools and parts you need. Values in this handbook apply "
               "to firmware 4.2 and later. Earlier firmware uses the same procedures with fewer menu "
               "options."))
    s.append(PageBreak())

    # Page 2: safety
    s.append(h1("2. Safety"))
    s.append(p("Read this chapter before you open the enclosure. The monitor runs on 24 V DC, but the "
               "site cabinet that feeds it may carry mains voltage."))
    s.append(h2("2.1 Personal protective equipment"))
    s.append(p("Wear safety glasses, nitrile gloves and waterproof boots. Use a life jacket when you work "
               "within two metres of an open channel deeper than one metre."))
    s.append(h2("2.2 Isolation procedure"))
    s.append(p("Switch off the cabinet breaker, lock it and attach a personal tag. Check that the status "
               "light on the monitor is off before you disconnect any cable. Never rely on the monitor's "
               "own power button for isolation."))
    s.append(h2("2.3 Chemical handling"))
    s.append(p("Calibration buffers are mildly corrosive. Store them below 25 °C, keep the bottles closed "
               "and rinse any spill with clean water. Safety data sheets are kept in the van folder."))
    s.append(PageBreak())

    # Page 3: installation
    s.append(h1("3. Installation"))
    s.append(h2("3.1 Site survey"))
    s.append(p("Confirm with the site operator where the sensor head will be mounted. Choose a point with "
               "steady flow, at least 30 cm below the lowest expected water level and away from aeration "
               "outlets that trap bubbles on the optical window."))
    s.append(h2("3.2 Mounting the sensor head"))
    s.append(p("Fix the stainless steel bracket to the channel wall with the four M10 anchors supplied. "
               "Slide the sensor pole into the bracket and tighten the clamp until the pole cannot rotate "
               "by hand. Route the cable through the strain relief."))
    s.append(h2("3.3 Connecting the gateway"))
    s.append(p("Connect the data cable to port B of the gateway. The gateway detects the monitor within "
               "two minutes and shows it with its serial number, for example LX2-0457-1182."))
    s.append(PageBreak())

    # Page 4: calibration
    s.append(h1("4. Calibration"))
    s.append(p("Calibrate every probe after installation, after any probe replacement and at the interval "
               "given in chapter 5. The monitor stores the last ten calibration records."))
    s.append(h2("4.1 pH probe"))
    s.append(p("Use a two-point calibration with pH 7.00 and pH 4.01 buffers. Rinse the probe with "
               "deionised water between buffers and wait until the reading is stable for 30 seconds."))
    s.append(h2("4.2 Conductivity probe"))
    s.append(p("Use the 1413 µS/cm standard. Hold the probe in the middle of the beaker, away from the "
               "walls, and gently tap it to release trapped air."))
    s.append(h2("4.3 Turbidity sensor"))
    s.append(p("Wipe the optical window with a lint-free cloth, then run the zero calibration in clean "
               "water. Accept the result only if the drift reported by the monitor is below 0.2 NTU."))
    s.append(PageBreak())

    # Page 5: maintenance schedule
    s.append(h1("5. Maintenance schedule"))
    s.append(p("The table lists the routine tasks per interval. Record every visit in the service log of "
               "the gateway so that the next engineer sees what was done."))
    s.append(Spacer(1, 3 * mm))
    s.append(table([
        ["Interval", "Task", "Parts", "Time"],
        ["Monthly", "Clean the optical window and check the wiper blade", "Cleaning kit CK-01", "15 min"],
        ["Quarterly", "Two-point pH calibration and conductivity check", "Buffer set BS-07", "40 min"],
        ["Six-monthly", "Replace the wiper blade and the desiccant pack", "WB-12, DP-03", "25 min"],
        ["Yearly", "Replace the pH probe junction and inspect all seals", "Junction kit JK-20", "60 min"],
        ["Every 3 years", "Replace the dissolved oxygen membrane cap", "Membrane cap MC-05", "30 min"],
    ], [28 * mm, 70 * mm, 38 * mm, 22 * mm]))
    s.append(Spacer(1, 5 * mm))
    s.append(p("Shorten the intervals by half on sites with heavy algae growth or with suspended solids "
               "above 200 mg/l."))
    s.append(PageBreak())

    # Page 6: troubleshooting
    s.append(h1("6. Troubleshooting"))
    s.append(h2("6.1 No readings on the gateway"))
    s.append(p("Check the status light. Steady green means the monitor runs and the fault is on the "
               "link. Flashing amber means the monitor waits for a calibration. No light means there is "
               "no power: check the cabinet breaker and the 24 V supply."))
    s.append(h2("6.2 Unstable pH readings"))
    s.append(p("Unstable readings usually come from a dirty or dry junction. Soak the probe in storage "
               "solution for one hour and calibrate again. Replace the junction if the slope stays below "
               "92 percent."))
    s.append(h2("6.3 Turbidity reads too high"))
    s.append(p("Look for bubbles or a biofilm on the optical window. Check that the wiper parks outside "
               "the measuring path. Move the sensor if aeration outlets are close."))
    s.append(PageBreak())

    # Page 7: service requests
    s.append(h1("7. Service requests"))
    s.append(p("Site operators request a visit with the service request form. The form is a fillable "
               "PDF: the operator types the details, signs it and sends it to the regional service desk."))
    s.append(h2("7.1 Priorities"))
    s.append(p("<b>Standard</b>: a visit within ten working days. <b>Urgent</b>: within two working days, "
               "for a monitor that still measures but drifts. <b>Emergency</b>: the same day, for a "
               "monitor that stopped measuring on a regulated discharge point."))
    s.append(h2("7.2 Contact"))
    s.append(p("Regional service desk, Larkfield Instruments Ltd, service@larkfield.example, "
               "telephone 01632 960 418 (fictitious number)."))
    s.append(PageBreak())

    # Page 8: glossary
    s.append(h1("8. Glossary"))
    for term, text in [
        ("Buffer", "A solution with a known pH value used to calibrate a pH probe."),
        ("Drift", "A slow change of a reading over time without a change of the measured water."),
        ("Gateway", "The site unit that collects readings from monitors and sends them to the data platform."),
        ("Junction", "The porous part of a pH probe that connects the reference electrode to the water."),
        ("NTU", "Nephelometric turbidity unit, the unit used for turbidity readings."),
        ("Slope", "The response of a pH probe compared with an ideal probe, in percent."),
    ]:
        s.append(p(f"<b>{term}.</b> {text}"))
    s.append(Spacer(1, 10 * mm))
    s.append(Paragraph("All names, addresses, part numbers and telephone numbers in this document are "
                       "fictitious.", SMALL))

    doc.build(s)


# --------------------------------------------------------------------------
# Form
# --------------------------------------------------------------------------

def build_form(path):
    width, height = A4
    c = canvas.Canvas(str(path), pagesize=A4)
    c.setTitle("Service Request Form")
    c.setAuthor(COMPANY)
    c.setSubject("Fictitious sample form")
    c.setCreator("generate_samples.py")
    form = c.acroForm

    left = 22 * mm
    right = width - 22 * mm

    c.setFillColor(ACCENT)
    c.rect(0, height - 32 * mm, width, 32 * mm, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 20)
    c.drawString(left, height - 18 * mm, "Service Request Form")
    c.setFont("Helvetica", 10)
    c.drawString(left, height - 25 * mm, f"{COMPANY}  |  Regional service desk")

    def label(text, x, y):
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 8.5)
        c.drawString(x, y, text)

    def section(text, y):
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(left, y, text)
        c.setStrokeColor(RULE)
        c.setLineWidth(0.6)
        c.line(left, y - 2.5 * mm, right, y - 2.5 * mm)

    field_style = dict(borderColor=RULE, fillColor=colors.HexColor("#f5f7fa"), textColor=INK,
                       forceBorder=True, borderWidth=0.8, fontName="Helvetica", fontSize=10)

    def text_field(name, tooltip, x, y, w, h=7.5 * mm, multiline=False):
        form.textfield(name=name, tooltip=tooltip, x=x, y=y, width=w, height=h,
                       fieldFlags="multiline" if multiline else "", **field_style)

    col_w = (right - left - 8 * mm) / 2
    col2 = left + col_w + 8 * mm

    y = height - 46 * mm
    section("1. Contact", y)
    y -= 9 * mm
    label("Full name", left, y)
    label("Company", col2, y)
    text_field("contact_name", "Full name", left, y - 9 * mm, col_w)
    text_field("company", "Company", col2, y - 9 * mm, col_w)
    y -= 15 * mm
    label("Email", left, y)
    label("Telephone", col2, y)
    text_field("email", "Email", left, y - 9 * mm, col_w)
    text_field("phone", "Telephone", col2, y - 9 * mm, col_w)
    y -= 15 * mm
    label("Site address", left, y)
    text_field("site_address", "Site address", left, y - 9 * mm, right - left)

    y -= 22 * mm
    section("2. Device and issue", y)
    y -= 9 * mm
    label("Monitor serial number", left, y)
    label("Issue category", col2, y)
    text_field("serial_number", "Monitor serial number", left, y - 9 * mm, col_w)
    form.choice(name="issue_category", tooltip="Issue category",
                value="Select a category",
                options=["Select a category", "No readings", "Unstable readings", "Physical damage",
                         "Calibration due", "Other"],
                x=col2, y=y - 9 * mm, width=col_w, height=7.5 * mm, **field_style)
    y -= 15 * mm
    label("Priority", left, y)
    c.setFont("Helvetica", 10)
    c.setFillColor(INK)
    px = left
    for value, text in [("standard", "Standard"), ("urgent", "Urgent"), ("emergency", "Emergency")]:
        form.radio(name="priority", tooltip=f"Priority: {text}", value=value, selected=value == "standard",
                   x=px, y=y - 8 * mm, size=5 * mm, buttonStyle="circle", borderColor=MUTED,
                   fillColor=colors.white, textColor=ACCENT, forceBorder=True)
        c.setFillColor(INK)
        c.drawString(px + 7 * mm, y - 6.6 * mm, text)
        px += 34 * mm
    label("Preferred visit date", col2 + 14 * mm, y)
    text_field("visit_date", "Preferred visit date (YYYY-MM-DD)", col2 + 14 * mm, y - 9 * mm, col_w - 14 * mm)
    y -= 15 * mm
    label("Describe the issue", left, y)
    text_field("description", "Describe the issue", left, y - 31 * mm, right - left, h=29 * mm, multiline=True)

    y -= 44 * mm
    section("3. Site access", y)
    y -= 10 * mm
    for name, text in [
        ("under_warranty", "The monitor is under warranty"),
        ("escort_required", "Engineers need an escort on site"),
        ("induction_required", "A site safety induction is required"),
    ]:
        form.checkbox(name=name, tooltip=text, x=left, y=y - 1.5 * mm, size=5 * mm, buttonStyle="check",
                      borderColor=MUTED, fillColor=colors.white, textColor=ACCENT, forceBorder=True)
        c.setFillColor(INK)
        c.setFont("Helvetica", 10)
        c.drawString(left + 8 * mm, y, text)
        y -= 8 * mm

    y -= 6 * mm
    section("4. Signature", y)
    y -= 9 * mm
    label("Name of signatory", left, y)
    label("Signature", col2, y)
    text_field("signatory", "Name of signatory", left, y - 9 * mm, col_w)
    # The signature field itself is added with pypdf below (reportlab has no signature fields).
    c.setStrokeColor(RULE)
    c.rect(col2, y - 22 * mm, col_w, 20 * mm, stroke=1, fill=0)

    c.setFillColor(MUTED)
    c.setFont("Helvetica", 8)
    c.drawString(left, 12 * mm, "Fictitious sample form for demonstration only. Send completed forms to "
                 "service@larkfield.example.")
    c.save()

    signature_rect = [col2, y - 22 * mm, col2 + col_w, y - 2 * mm]
    add_signature_field(path, signature_rect)


def add_signature_field(path, rect):
    reader = PdfReader(str(path))
    writer = PdfWriter(clone_from=reader)
    page = writer.pages[0]
    field = DictionaryObject({
        NameObject("/Type"): NameObject("/Annot"),
        NameObject("/Subtype"): NameObject("/Widget"),
        NameObject("/FT"): NameObject("/Sig"),
        NameObject("/T"): TextStringObject("signature"),
        NameObject("/TU"): TextStringObject("Signature"),
        NameObject("/F"): NumberObject(4),
        NameObject("/Rect"): ArrayObject([FloatObject(v) for v in rect]),
        NameObject("/P"): page.indirect_reference,
    })
    ref = writer._add_object(field)
    page[NameObject("/Annots")].append(ref)
    writer._root_object["/AcroForm"][NameObject("/Fields")].append(ref)
    with open(path, "wb") as fh:
        writer.write(fh)


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    handbook = OUT_DIR / "field-service-handbook.pdf"
    form = OUT_DIR / "service-request-form.pdf"
    build_handbook(handbook)
    build_form(form)
    for f in (handbook, form):
        print(f"{f.relative_to(ROOT)}  {f.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
