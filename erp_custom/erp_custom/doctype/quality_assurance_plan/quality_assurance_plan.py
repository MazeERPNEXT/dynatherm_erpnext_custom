# Copyright (c) 2026, maze and contributors
# For license information, please see license.txt

# # import frappe
# from frappe.model.document import Document


# class QualityAssurancePlan(Document):
# 	pass




# import frappe
# import io
# from frappe.model.document import Document


# class QualityAssurancePlan(Document):

#     @frappe.whitelist()
#     def merge_pdfs(self):

#         try:
#             from pypdf import PdfReader, PdfWriter
#         except ImportError:
#             frappe.throw("pypdf library not installed")

#         from frappe.utils.file_manager import get_file_path
#         from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
#         from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
#         from reportlab.lib import colors
#         from reportlab.lib.units import inch

#         writer = PdfWriter()
#         pdf_buffers = []
#         index_data = []

#         current_page = 2  # Page 1 reserved for index
#         pdf_found = False

#         # 🔹 Step 1: Read PDFs & collect page counts
#         for row in self.qap_item:
#             if row.attachment:
#                 file_path = get_file_path(row.attachment)
#                 reader = PdfReader(file_path)

#                 page_count = len(reader.pages)

#                 index_data.append({
#                     "title": row.characteristics or "Untitled",
#                     "start_page": current_page
#                 })

#                 current_page += page_count
#                 pdf_buffers.append(reader)
#                 pdf_found = True

#         if not pdf_found:
#             frappe.throw("No PDF files found.")

#         # 🔹 Step 2: Create Index Page PDF
#         index_buffer = io.BytesIO()
#         doc = SimpleDocTemplate(index_buffer)
#         elements = []

#         styles = getSampleStyleSheet()
#         title_style = styles["Heading1"]

#         elements.append(Paragraph("INDEX", title_style))
#         elements.append(Spacer(1, 0.5 * inch))

#         normal_style = styles["Normal"]

#         for item in index_data:
#             line = f"{item['title']} ................................ Page {item['start_page']}"
#             elements.append(Paragraph(line, normal_style))
#             elements.append(Spacer(1, 0.2 * inch))

#         doc.build(elements)
#         index_buffer.seek(0)

#         # 🔹 Step 3: Add Index Page First
#         index_reader = PdfReader(index_buffer)
#         for page in index_reader.pages:
#             writer.add_page(page)

#         # 🔹 Step 4: Add All Other PDFs
#         for reader in pdf_buffers:
#             for page in reader.pages:
#                 writer.add_page(page)

#         # 🔹 Step 5: Save Final PDF via File DocType
#         final_buffer = io.BytesIO()
#         writer.write(final_buffer)
#         final_buffer.seek(0)

#         file_doc = frappe.get_doc({
#             "doctype": "File",
#             "file_name": f"{self.name}_Dossier.pdf",
#             "attached_to_doctype": self.doctype,
#             "attached_to_name": self.name,
#             "is_private": 1,
#             "content": final_buffer.read()
#         })

#         file_doc.insert(ignore_permissions=True)

#         return file_doc.file_url


import frappe
import io
from frappe.model.document import Document

class QualityAssurancePlan(Document):

    @frappe.whitelist()
    def merge_pdfs(self):

        try:
            from pypdf import PdfReader, PdfWriter
        except ImportError:
            frappe.throw("pypdf library not installed")

        from frappe.utils.file_manager import get_file_path
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib import colors
        from reportlab.lib.units import inch
        from reportlab.lib.pagesizes import A4

        writer = PdfWriter()
        pdf_buffers = []
        index_data = []

        current_page = 2  # Page 1 reserved for index
        pdf_found = False
        serial_no = 1

        # 🔹 Step 1: Read PDFs & collect page ranges
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

        # 🔹 Step 2: Create Professional Index Page
        index_buffer = io.BytesIO()
        doc = SimpleDocTemplate(index_buffer, pagesize=A4)
        elements = []

        styles = getSampleStyleSheet()

        # Title Style
        title_style = styles["Heading1"]
        elements.append(Paragraph("<b>QUALITY ASSURANCE DOSSIER - INDEX</b>", title_style))
        elements.append(Spacer(1, 0.5 * inch))

        # Table Data
        table_data = [[
                    Paragraph("<b> S.No </b>"),
                    Paragraph("<b> Document Name </b>"),
                    Paragraph("<b> Page No </b>")
                ]]
        # table_data = [["S.No", "Document Name", "Page No"]]

        for item in index_data:
            table_data.append([
                item["serial"],
                item["title"],
                item["range"]
            ])

        table = Table(table_data, colWidths=[0.8 * inch, 4.5 * inch, 1.2 * inch])

        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),

            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('ALIGN', (2, 1), (2, -1), 'CENTER'),

            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),

            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('BACKGROUND', (0, 1), (-1, -1), colors.whitesmoke),
        ]))

        elements.append(table)
        doc.build(elements)
        index_buffer.seek(0)

        # 🔹 Step 3: Add Index Page First
        index_reader = PdfReader(index_buffer)
        for page in index_reader.pages:
            writer.add_page(page)

        # 🔹 Step 4: Add All Other PDFs
        for reader in pdf_buffers:
            for page in reader.pages:
                writer.add_page(page)

        # 🔹 Step 5: Save Final PDF
        final_buffer = io.BytesIO()
        writer.write(final_buffer)
        final_buffer.seek(0)

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