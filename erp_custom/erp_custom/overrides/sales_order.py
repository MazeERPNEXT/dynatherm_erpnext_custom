import frappe
from erpnext.selling.doctype.sales_order.sales_order import make_project as original_make_project


# @frappe.whitelist()
# def make_project(source_name, target_doc=None):
#     # 🔹 Call original ERPNext function
#     project = original_make_project(source_name, target_doc)

#     # 🔹 Get Sales Order
#     so = frappe.get_doc("Sales Order", source_name)

#     #  CLEAR existing child table
#     project.expected_start_date = so.po_date
#     project.expected_end_date = so.delivery_date
#     project.set("custom_certificates", [])

#     #  MAP certificates
#     for row in so.custom_certificate_type:
#         project.append("custom_certificates", {
#             "certificate_type": row.certificate_type
#         })
        
#     project.set("custom_project_detail", [])  # clear first

#     for item in so.items:
#         project.append("custom_project_detail", {
#             "item_code": item.item_code,
#             "item_name": item.item_name,
#             "tag_no": item.custom_tag_no,
#             "qty": item.qty,
#             "uom": item.uom,
#             "description": item.description,
#             "certificate_type": item.custom_certificate_type,
#         })

#     return project



# @frappe.whitelist()
# def make_project(source_name, target_doc=None):

#     # 🔹 Call original ERPNext function
#     project = original_make_project(source_name, target_doc)

#     # 🔹 Get Sales Order
#     so = frappe.get_doc("Sales Order", source_name)

#     # ❌ REMOVE AUTO NAME (important line)
#     project.project_name = None   # or ""

#     # ✅ Your existing logic
#     project.expected_start_date = so.po_date
#     project.expected_end_date = so.delivery_date

#     project.set("custom_certificates", [])

#     for row in so.custom_certificate_type:
#         project.append("custom_certificates", {
#             "certificate_type": row.certificate_type
#         })

#     project.set("custom_project_detail", [])

#     for item in so.items:
#         project.append("custom_project_detail", {
#             "item_code": item.item_code,
#             "item_name": item.item_name,
#             "tag_no": item.custom_tag_no,
#             "qty": item.qty,
#             "uom": item.uom,
#             "description": item.description,
#             "certificate_type": item.custom_certificate_type,
#         })

#     return project

@frappe.whitelist()
def make_project(source_name, target_doc=None):

    so = frappe.get_doc("Sales Order", source_name)

    # ======================================================
    # ✅ FILTER ONLY ITEMS WITHOUT PROJECT
    # ======================================================
    pending_items = [item for item in so.items if not item.project]

    # ❌ If no pending items → stop
    if not pending_items:
        frappe.throw("All items already have Projects")

    # ======================================================
    # ✅ Create Project
    # ======================================================
    project = original_make_project(source_name, target_doc)

    # ❌ Remove auto name
    project.project_name = None

    # Dates
    project.expected_start_date = so.po_date
    project.expected_end_date = so.delivery_date

    # ======================================================
    # ✅ MAP ONLY PENDING ITEMS
    # ======================================================
    project.set("custom_project_detail", [])

    for item in pending_items:
        project.append("custom_project_detail", {
            "item_code": item.item_code,
            "item_name": item.item_name,
            "tag_no": item.custom_tag_no,
            "qty": item.qty,
            "uom": item.uom,
            "description": item.description,
            "certificate_type": item.custom_certificate_type,
        })

    return project