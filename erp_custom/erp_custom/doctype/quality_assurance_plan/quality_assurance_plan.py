import frappe
import io
from frappe.model.document import Document
from frappe.utils import nowdate, getdate 
from reportlab.lib.styles import ParagraphStyle

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

        # ---------------------------------------------------
        # STYLES
        # ---------------------------------------------------

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
        # STEP 1: Collect Attachments
        # ---------------------------------------------------

        current_page = 3
        serial_no = 1
        pdf_found = False

        for row in self.qap_item:
            if row.attachment:
                file_path = get_file_path(row.attachment)
                reader = PdfReader(file_path)

                page_count = len(reader.pages)
                start_page = current_page
                end_page = current_page + page_count - 1

                index_data.append({
                    "serial": serial_no,
                    "title": row.characteristics or "Untitled",
                    "range": f"{start_page} - {end_page}"
                })

                current_page += page_count
                serial_no += 1
                pdf_buffers.append(reader)
                pdf_found = True

        if not pdf_found:
            frappe.throw("No PDF files found.")

        # ---------------------------------------------------
        # STEP 2: Cover Page
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

        try:
            letterhead_path = frappe.get_site_path("public", "files", "Dapl_letter_head.png")
            letter_img = Image(letterhead_path, width=6.5 * inch, height=1.2 * inch)
            cover_elements.append(letter_img)
            cover_elements.append(Spacer(1, 0.4 * inch))
        except Exception:
            pass

        cover_elements.append(Paragraph("QUALITY ASSURANCE PLAN", title_style))
        cover_elements.append(Spacer(1, 0.3 * inch))

        details_data = [
            ["QAP ID", self.name],
            ["Date", str(self.date or "")],
            ["Project", str(self.project or "")],
            ["Tag No", self.tag_no or ""],
            ["Purchase Order No", self.purchase_order_no or ""],
            ["PO Date", str(self.purchase_order_date or "")],
            ["Drawing No", self.drg_no or ""],
            ["Item Code", self.item_code or ""],
            ["Item Name", self.item_name or ""],
            ["Quantity", str(self.qty or "")]
        ]

        details_table = Table(details_data, colWidths=[2.5 * inch, 3.5 * inch])
        details_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BACKGROUND', (0, 0), (0, -1), colors.whitesmoke),
        ]))

        cover_elements.append(details_table)
        cover_doc.build(cover_elements)
        cover_buffer.seek(0)

        # ---------------------------------------------------
        # STEP 3: Index Page
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

        table_data = [["S.No", "Document Name", "Page No"]]

        
        # Style for wrapping text
        wrap_style = ParagraphStyle(
            name="WrapStyle",
            fontName="Helvetica",
            fontSize=10,
            leading=12  
        )

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
        # STEP 4: Merge All PDFs
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
        # STEP 6: Add Page Numbers
        # ---------------------------------------------------

        numbered_writer = PdfWriter()
        reader = PdfReader(final_buffer)

        for i, page in enumerate(reader.pages):
            packet = io.BytesIO()

            can = canvas.Canvas(packet, pagesize=A4)
            can.setFont("Helvetica", 10)

            # Bottom center page number
            # can.drawCentredString(A4[0] / 2, 20, f"{i + 1}")
            # Bottom Right Corner page number
            can.drawRightString(A4[0] - 10, 15, f"{i + 1}")

            can.save()
            packet.seek(0)

            overlay_pdf = PdfReader(packet)
            page.merge_page(overlay_pdf.pages[0])

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