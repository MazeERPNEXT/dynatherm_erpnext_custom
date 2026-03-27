# Copyright (c) 2026, maze and contributors
# For license information, please see license.txt

# import frappe
# from frappe.model.document import Document


# class CuttingPlan(Document):
# 	pass

import frappe
from frappe.model.document import Document


class CuttingPlan(Document):
    def validate(self):
        self.sync_job_no_from_child()

    def sync_job_no_from_child(self):
        job_nos = set()

        # 🔹 Collect from child table
        for row in self.cutting_plan_plate_details:
            if row.job_no:
                job_nos.add(row.job_no)

        # 🔹 Clear parent table
        self.set("job_no", [])

        # 🔹 Add unique values to parent multiselect table
        for jn in job_nos:
            self.append("job_no", {
                "job_no": jn
            })
            
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


@frappe.whitelist()
def make_request_for_quotation(cutting_plan):

    cp = frappe.get_doc("Cutting Plan", cutting_plan)

    if cp.docstatus != 1:
        frappe.throw("Cutting Plan must be Submitted")

    rfq = frappe.new_doc("Request for Quotation")

    rfq.transaction_date = cp.date
    rfq.company = frappe.defaults.get_user_default("Company")
    rfq.status = "Draft"

    for row in cp.cutting_plan_plate_details:

        if row.material_availability != "Not Available":
            continue

        rfq.append("items", {
            "custom_cutting_plan_no": cp.name,
            "item_code": row.item_code,
            "qty": row.qty or 1,
            "uom": row.uom,
            "conversion_factor": 1,
            "custom_length": row.length,
            "custom_width": row.width,
            "custom_thickness": row.thickness,
        })

    # 🔥 REQUIRED FIXES
    rfq.flags.ignore_validate = True
    rfq.flags.ignore_mandatory = True   

    rfq.insert(ignore_permissions=True)
    return rfq.name
