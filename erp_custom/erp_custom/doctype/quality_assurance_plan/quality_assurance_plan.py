# Copyright (c) 2026, maze and contributors
# For license information, please see license.txt

# # import frappe
# from frappe.model.document import Document


# class QualityAssurancePlan(Document):
# 	pass


# import frappe
# import os
# from frappe.model.document import Document

# class QualityAssurancePlan(Document):

#     @frappe.whitelist()
#     def merge_pdfs(self):
#         from pypdf import PdfMerger

#         merger = PdfMerger()
#         pdf_urls = []

#         # Collect all attachment URLs safely
#         for row in self.qap_item:
#             if row.get("attachment"):
#                 pdf_urls.append(row.get("attachment"))

#         if not pdf_urls:
#             frappe.throw("No PDF files found in QAP Item table.")

#         for file_url in pdf_urls:

#             file_doc = frappe.get_doc("File", {"file_url": file_url})

#             if not file_doc:
#                 continue

#             file_path = file_doc.get_full_path()

#             if os.path.exists(file_path):
#                 merger.append(file_path)

#         if not merger.pages:
#             frappe.throw("PDF files could not be processed.")

#         output_filename = f"Merged_QA_{self.name}.pdf"
#         output_path = os.path.join(
#             frappe.get_site_path("private", "files"),
#             output_filename
#         )

#         merger.write(output_path)
#         merger.close()

#         new_file = frappe.get_doc({
#             "doctype": "File",
#             "file_name": output_filename,
#             "is_private": 1,
#             "file_url": f"/private/files/{output_filename}"
#         })

#         new_file.insert(ignore_permissions=True)

#         return new_file.file_url


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

        writer = PdfWriter()
        pdf_found = False

        for row in self.qap_item:
            if row.attachment:
                file_path = get_file_path(row.attachment)
                reader = PdfReader(file_path)

                for page in reader.pages:
                    writer.add_page(page)

                pdf_found = True

        if not pdf_found:
            frappe.throw("No PDF files found.")

        pdf_buffer = io.BytesIO()
        writer.write(pdf_buffer)
        pdf_buffer.seek(0)

        file_doc = frappe.get_doc({
            "doctype": "File",
            "file_name": f"{self.name}_Dossier.pdf",
            "attached_to_doctype": self.doctype,
            "attached_to_name": self.name,
            "is_private": 1,
            "content": pdf_buffer.read()
        })

        file_doc.insert(ignore_permissions=True)

        return file_doc.file_url