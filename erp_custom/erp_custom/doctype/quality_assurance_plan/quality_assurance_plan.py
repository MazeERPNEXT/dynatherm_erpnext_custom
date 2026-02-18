# Copyright (c) 2026, maze and contributors
# For license information, please see license.txt

# # import frappe
# from frappe.model.document import Document


# class QualityAssurancePlan(Document):
# 	pass


import frappe
import os
from frappe.model.document import Document

class QualityAssurancePlan(Document):

    @frappe.whitelist()
    def merge_pdfs(self):
        from pypdf import PdfMerger

        merger = PdfMerger()
        pdf_urls = []

        # Collect all attachment URLs safely
        for row in self.qap_item:
            if row.get("attachment"):
                pdf_urls.append(row.get("attachment"))

        if not pdf_urls:
            frappe.throw("No PDF files found in QAP Item table.")

        for file_url in pdf_urls:

            file_doc = frappe.get_doc("File", {"file_url": file_url})

            if not file_doc:
                continue

            file_path = file_doc.get_full_path()

            if os.path.exists(file_path):
                merger.append(file_path)

        if not merger.pages:
            frappe.throw("PDF files could not be processed.")

        output_filename = f"Merged_QA_{self.name}.pdf"
        output_path = os.path.join(
            frappe.get_site_path("private", "files"),
            output_filename
        )

        merger.write(output_path)
        merger.close()

        new_file = frappe.get_doc({
            "doctype": "File",
            "file_name": output_filename,
            "is_private": 1,
            "file_url": f"/private/files/{output_filename}"
        })

        new_file.insert(ignore_permissions=True)

        return new_file.file_url