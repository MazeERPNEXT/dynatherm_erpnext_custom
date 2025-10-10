# Copyright (c) 2025, maze and contributors
# For license information, please see license.txt

# import frappe
# from frappe.model.document import Document




import frappe
from frappe.model.document import Document
from frappe.model.mapper import get_mapped_doc


class CustomerRequestForQuotation(Document):
	pass

@frappe.whitelist()
def make_estimate(source_name, target_doc=None):
    def set_missing_values(source, target):
        target.customer_rfq = source.name
        target.tender_id = source.crfq_id__tender_id
        target.tag = source.tag
        target.parent_moc = source.parent_moc

    doc = get_mapped_doc(
        "Customer Request For Quotation",
        source_name,
        {
            "Customer Request For Quotation": {
                "doctype": "Estimate",
                "field_map": {
                    "name": "customer_rfq",
                    "crfq_id__tender_id": "tender_id",
                    "tag": "tag",
                    "parent_moc": "parent_moc"
                }
            },
            "Customer Request For Quotation Item": {
                "doctype": "Estimate Item",
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
