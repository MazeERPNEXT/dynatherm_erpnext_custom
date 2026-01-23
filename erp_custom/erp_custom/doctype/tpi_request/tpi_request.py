# Copyright (c) 2026, maze and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class TPIRequest(Document):
	pass
import frappe


@frappe.whitelist()
def get_inspection_items(quality_inspections):
    if isinstance(quality_inspections, str):
        quality_inspections = frappe.parse_json(quality_inspections)

    result = []

    for qi_name in quality_inspections:
        qi_doc = frappe.get_doc("Quality Inspection", qi_name)

        for row in qi_doc.readings:
            result.append({
                "quality_inspection": qi_doc.name,
                "item_code": qi_doc.item_code,
                "item_name": qi_doc.item_name,
                "specification": row.specification,
                "value": row.reading_value,
                "status": row.status
            })

    return result


