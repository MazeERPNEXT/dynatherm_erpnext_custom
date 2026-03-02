# Copyright (c) 2026, maze and contributors
# For license information, please see license.txt

# import frappe
# from frappe.model.document import Document


# class CuttingPlan(Document):
# 	pass


import frappe
from frappe.model.document import Document


class CuttingPlan(Document):
    pass


@frappe.whitelist()
def make_material_request(cutting_plan):

    cp = frappe.get_doc("Cutting Plan", cutting_plan)

    if cp.docstatus != 1:
        frappe.throw("Cutting Plan must be Submitted")

    mr = frappe.new_doc("Material Request")
    mr.material_request_type = "Material Transfer"
    mr.schedule_date = cp.date

    # 🔹 Use Correct Child Table Fieldname Here
    for row in cp.cutting_plan_item:
        mr.append("items", {
            "item_code": row.item_code,
            "qty": row.qty if hasattr(row, "qty") else 1,
            "schedule_date": cp.date
        })

    mr.insert(ignore_permissions=True)

    return mr.name