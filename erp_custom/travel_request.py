import frappe
from frappe.model.document import Document
from frappe.model.mapper import get_mapped_doc
import datetime
import  json

@frappe.whitelist()
def make_tr_to_empoladvance(source_name, target_doc=None):
    doc = get_mapped_doc(
        "Travel Request",
        source_name,
        {
            "Travel Request": {
                "doctype": "Employee Advance",
                "validation": {
                    "docstatus": ["=", 1]
                },
                "field_map": {
                    "purpose_of_travel": "purpose",
                    "employee": "employee",
                    "employee_name": "employee_name",
                    "custom_total_trip_bills":"advance_amount",
                    "name":"custom_travel_request_no"
                }
            }
        },
        target_doc
    )
    return doc
