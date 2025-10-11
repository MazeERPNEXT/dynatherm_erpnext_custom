# Copyright (c) 2025, maze and contributors
# For license information, please see license.txt

# import frappe
# from frappe.model.document import Document


# class Estimate(Document):
# 	pass


import frappe
from frappe.model.document import Document
from frappe.model.mapper import get_mapped_doc


class Estimate(Document):
	pass

@frappe.whitelist()
def make_quotation(source_name, target_doc=None):
    def set_missing_values(source, target):
        target.customer_rfq = source.name

    doc = get_mapped_doc(
        "Estimate",
        source_name,
        {
            "Estimate": {
                "doctype": "Quotation",
                "field_map": {
                    "name": "customer_rfq",
                }
            },
            "Estimate Item": {
                "doctype": "Quotation Item",
                "field_map": {
                    "item_name": "item_name",
                    "quantity": "quantity"
                }
            }
        },
        target_doc,
        set_missing_values
    )

    return doc


