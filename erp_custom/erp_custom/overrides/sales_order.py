import frappe
from erpnext.selling.doctype.sales_order.sales_order import make_project as original_make_project


@frappe.whitelist()
def make_project(source_name, target_doc=None):
    # 🔹 Call original ERPNext function
    project = original_make_project(source_name, target_doc)

    # 🔹 Get Sales Order
    so = frappe.get_doc("Sales Order", source_name)

    # 🔥 CLEAR existing child table
    project.set("custom_certificates", [])

    # 🔥 MAP certificates
    for row in so.custom_certificate_type:
        project.append("custom_certificates", {
            "certificate_type": row.certificate_type
        })

    return project