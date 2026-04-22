import frappe
import io
import os
from frappe.model.document import Document
from frappe.utils import nowdate, getdate 

class QualityAssurancePlan(Document):

    def before_insert(self):
        if not self.qap_id:
            self.qap_id = self.generate_qap_id()

    def generate_qap_id(self):
        date = getdate(nowdate())
        return f"DAPL-INS-{date.strftime('%d-%m-%Y')}"

    @frappe.whitelist()
    def merge_pdfs(self):

        try:
            from pypdf import PdfReader, PdfWriter
        except ImportError:
            frappe.throw("pypdf library not installed")

        from frappe.utils.file_manager import get_file_path
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
        )
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors
        from reportlab.lib.units import inch
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.enums import TA_CENTER
        from reportlab.pdfgen import canvas

        writer = PdfWriter()
        pdf_buffers = []
        index_data = []

        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            name="TitleStyle",
            parent=styles["Heading1"],
            fontSize=22,
            spaceAfter=20,
            alignment=TA_CENTER
        )

        section_heading = ParagraphStyle(
            name="SectionHeading",
            parent=styles["Heading2"],
            fontSize=16,
            spaceAfter=15,
            alignment=TA_CENTER
        )

        # ---------------------------------------------------
        # STEP 1: Collect Attachments (SAFE)
        # ---------------------------------------------------

        current_page = 1   # ✅ Start from 1 (attachment numbering)
        serial_no = 1
        pdf_found = False

        for row in self.qap_item:
            if row.attachment:
                file_path = get_file_path(row.attachment)

                # ✅ Skip invalid files
                if not file_path or not os.path.exists(file_path) or os.path.getsize(file_path) == 0:
                    continue

                try:
                    reader = PdfReader(file_path)
                except Exception:
                    frappe.msgprint(f"Invalid PDF skipped: {row.attachment}")
                    continue

                page_count = len(reader.pages)

                index_data.append({
                    "serial": serial_no,
                    "title": row.characteristics or "Untitled",
                    "range": f"{current_page} - {current_page + page_count - 1}"
                })

                current_page += page_count
                serial_no += 1
                pdf_buffers.append(reader)
                pdf_found = True

        if not pdf_found:
            frappe.throw("No valid PDF files found.")

        # ---------------------------------------------------
        # STEP 2: Cover Page (FINAL PROFESSIONAL)
        # ---------------------------------------------------

        cover_buffer = io.BytesIO()

        cover_doc = SimpleDocTemplate(
            cover_buffer,
            pagesize=A4,
            rightMargin=40,
            leftMargin=40,
            topMargin=60,
            bottomMargin=40
        )

        cover_elements = []

        # ---------------- STYLES ----------------
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            name="TitleStyle",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=22,
            alignment=TA_CENTER,
            spaceAfter=20
        )

        label_style = ParagraphStyle(
            name="LabelStyle",
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=12
        )

        value_style = ParagraphStyle(
            name="ValueStyle",
            fontName="Helvetica",
            fontSize=10,
            leading=12
        )

        # ---------------- LETTERHEAD ----------------
        try:
            letterhead_path = frappe.get_site_path("public", "files", "Dapl_letter_head.png")
            letter_img = Image(letterhead_path, width=6.5 * inch, height=1.2 * inch)
            cover_elements.append(letter_img)
            cover_elements.append(Spacer(1, 0.4 * inch))
        except Exception:
            pass

        # ---------------- TITLE ----------------
        cover_elements.append(Paragraph("QUALITY ASSURANCE PLAN", title_style))
        cover_elements.append(Spacer(1, 0.3 * inch))

        # ---------------- DETAILS TABLE ----------------
        details_data = [
            [Paragraph("QAP ID", label_style), Paragraph(self.name or "", value_style)],
            [Paragraph("QAP Date", label_style), Paragraph(str(self.date or ""), value_style)],
            [Paragraph("Project", label_style), Paragraph(str(self.project or ""), value_style)],
            [Paragraph("Tag No", label_style), Paragraph(self.tag_no or "", value_style)],
            [Paragraph("Customer's Purchase Order No", label_style), Paragraph(self.purchase_order_no or "", value_style)],
            [Paragraph("Customer's Purchase Order Date", label_style), Paragraph(str(self.purchase_order_date or ""), value_style)],
            [Paragraph("Drawing No", label_style), Paragraph(self.drg_no or "", value_style)],
            [Paragraph("Item Code", label_style), Paragraph(self.item_code or "", value_style)],
            [Paragraph("Item Name", label_style), Paragraph(self.item_name or "", value_style)],
            [Paragraph("Quantity", label_style), Paragraph(str(self.qty or ""), value_style)],
            [Paragraph("TPI Agency Person", label_style), Paragraph(str(self.tpi_agency_person or ""), value_style)]
        ]

        details_table = Table(
            details_data,
            colWidths=[2.4 * inch, 3.6 * inch]
        )

        details_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.4, colors.grey),
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor("#F2F2F2")),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),

            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))

        cover_elements.append(details_table)

        # ---------------- FOOTER ----------------
        def add_footer(canvas, doc):
            canvas.saveState()

            footer_text = "For Dynatherm Alloys Pvt. Ltd"

            canvas.setFont("Helvetica-Bold", 10)

            # Right aligned footer
            canvas.drawRightString(A4[0] - 40, 120, footer_text)

            canvas.restoreState()

        # ---------------- BUILD ----------------
        cover_doc.build(cover_elements, onFirstPage=add_footer)
        cover_buffer.seek(0)

        # ---------------------------------------------------
        # STEP 3: Index Page (WITH WRAP)
        # ---------------------------------------------------

        index_buffer = io.BytesIO()
        index_doc = SimpleDocTemplate(
            index_buffer,
            pagesize=A4,
            rightMargin=40,
            leftMargin=40,
            topMargin=60,
            bottomMargin=40
        )

        index_elements = []
        index_elements.append(Paragraph("INDEX", section_heading))
        index_elements.append(Spacer(1, 0.4 * inch))

        wrap_style = ParagraphStyle(
            name="WrapStyle",
            fontName="Helvetica",
            fontSize=10,
            leading=12
        )

        table_data = [["S.No", "Document Name", "Page No"]]

        for item in index_data:
            table_data.append([
                item["serial"],
                Paragraph(item["title"], wrap_style),
                item["range"]
            ])

        table = Table(table_data, colWidths=[0.8 * inch, 4.5 * inch, 1.2 * inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#2E4053")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.4, colors.grey),
        ]))

        index_elements.append(table)
        index_doc.build(index_elements)
        index_buffer.seek(0)

        # ---------------------------------------------------
        # STEP 4: Merge PDFs
        # ---------------------------------------------------

        cover_reader = PdfReader(cover_buffer)
        for page in cover_reader.pages:
            writer.add_page(page)

        index_reader = PdfReader(index_buffer)
        for page in index_reader.pages:
            writer.add_page(page)

        for reader in pdf_buffers:
            for page in reader.pages:
                writer.add_page(page)

        # ---------------------------------------------------
        # STEP 5: Write merged PDF
        # ---------------------------------------------------

        final_buffer = io.BytesIO()
        writer.write(final_buffer)
        final_buffer.seek(0)

        # ---------------------------------------------------
        # STEP 6: Page Numbering (SKIP COVER + INDEX)
        # ---------------------------------------------------

        numbered_writer = PdfWriter()
        reader = PdfReader(final_buffer)

        start_from = 2   # skip cover + index
        page_number = 1

        for i, page in enumerate(reader.pages):
            packet = io.BytesIO()
            can = canvas.Canvas(packet, pagesize=A4)
            can.setFont("Helvetica", 10)

            if i >= start_from:
                can.drawRightString(A4[0] - 10, 15, f"{page_number}")
                page_number += 1

            can.save()
            packet.seek(0)

            try:
                overlay_pdf = PdfReader(packet)
                page.merge_page(overlay_pdf.pages[0])
            except Exception:
                pass

            numbered_writer.add_page(page)

        final_buffer = io.BytesIO()
        numbered_writer.write(final_buffer)
        final_buffer.seek(0)

        # ---------------------------------------------------
        # STEP 7: Save File
        # ---------------------------------------------------

        file_doc = frappe.get_doc({
            "doctype": "File",
            "file_name": f"{self.name}_Dossier.pdf",
            "attached_to_doctype": self.doctype,
            "attached_to_name": self.name,
            "is_private": 1,
            "content": final_buffer.read()
        })

        file_doc.insert(ignore_permissions=True)

        return file_doc.file_url
    
    
    
@frappe.whitelist()
def download_qap_template():
    import frappe
    from openpyxl import Workbook
    import io

    wb = Workbook()
    ws = wb.active
    ws.title = "QAP Template"

    # =========================================================
    # ✅ HEADERS (Parent + Child)
    # =========================================================

    headers = [

        # ---------------- PARENT ----------------
        "Client",
        "Vendor",
        "QAP ID",
        "QAP Date",
        "Project",
        "Sales Order No",
        "Purchase Order No",
        "Purchase Order Date",
        "Tag No",
        "Item Code",
        "Item Name",
        "Qty",
        "DRG No",
        "TPI Agency Person",
        "Prepared By",
        "Verified By",
        "Status",

        # ---------------- CHILD ----------------
        "ID (QAP Item)",
        "Characteristics (QAP Item)",
        "Type Of Check (QAP Item)",
        "Quantum Of Inspection (QAP Item)",
        "Applicable Documents (QAP Item)",
        "Record / Documents (QAP Item)",
        "Inspection By (QAP Item)",
        "Company (QAP Item)",
        "TPI (QAP Item)",
        "Client (QAP Item)",
        "Schedule (QAP Item)",
        "Attachment Type (QAP Item)",
        "Attachment (QAP Item)",
        "Remarks (QAP Item)"
    ]

    ws.append(headers)

    # =========================================================
    # ✅ COLUMN WIDTH (NEAT LOOK)
    # =========================================================

    for col in ws.columns:
        max_length = 0
        col_letter = col[0].column_letter

        for cell in col:
            try:
                if cell.value:
                    max_length = max(max_length, len(str(cell.value)))
            except:
                pass

        ws.column_dimensions[col_letter].width = max_length + 3

    # =========================================================
    # ✅ SAVE FILE
    # =========================================================

    file_stream = io.BytesIO()
    wb.save(file_stream)
    file_stream.seek(0)

    file_doc = frappe.get_doc({
        "doctype": "File",
        "file_name": "QAP_Template.xlsx",
        "is_private": 0,
        "content": file_stream.read()
    })

    file_doc.insert(ignore_permissions=True)

    return file_doc.file_url