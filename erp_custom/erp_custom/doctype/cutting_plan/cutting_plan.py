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

    # 🔹 Check existing Material Request using Cutting Plan number
    existing_mr = frappe.db.get_value(
        "Material Request Item",
        {"custom_cutting_plan_no": cp.name},
        "parent"
    )

    if existing_mr:
        return existing_mr

    # 🔹 Create new Material Request
    mr = frappe.new_doc("Material Request")
    mr.material_request_type = "Purchase"
    mr.company = cp.company 
    
    mr.schedule_date = cp.date

    # Loop Cutting Plan Plate Details
    for row in cp.cutting_plan_plate_details:
         # ✅ Only send items where material is NOT available
        if row.material_availability != "Not Available":
            continue
        
        mr.append("items", {
            "custom_cutting_plan_no": cp.name,
            "item_code": row.item_code,
            "qty": row.qty or 1,
            "uom": row.uom,
            "schedule_date": cp.date,
            "custom_length": row.length,
            "custom_width": row.width,
            "custom_thickness": row.thickness,
        })

    mr.insert(ignore_permissions=True)

    return mr.name