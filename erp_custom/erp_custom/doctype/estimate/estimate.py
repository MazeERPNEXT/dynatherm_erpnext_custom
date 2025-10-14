# Copyright (c) 2025, maze and contributors
# For license information, please see license.txt

# import frappe
# from frappe.model.document import Document


# class Estimate(Document):
# 	pass


# import frappe
# from frappe.model.document import Document
# from frappe.model.mapper import get_mapped_doc


# class Estimate(Document):
# 	pass

# @frappe.whitelist()
# def make_quotation(source_name, target_doc=None):
#     def set_missing_values(source, target):
#         target.customer_rfq = source.name

#     doc = get_mapped_doc(
#         "Estimate",
#         source_name,
#         {
#             "Estimate": {
#                 "doctype": "Quotation",
#                 "field_map": {
#                     "name": "customer_rfq",
#                 }
#             },
#             "Estimate Item": {
#                 "doctype": "Quotation Item",
#                 "field_map": {
#                     "item_name": "item_name",
#                     "quantity": "quantity"
#                 }
#             }
#         },
#         target_doc,
#         set_missing_values
#     )

#     return doc




# import frappe
# from frappe.model.document import Document

# class Estimate(Document):
#     def on_submit(self):
#         """Mark linked CRFQ as Created when Estimate is submitted"""
#         if self.customer_rfq_reference:
#             frappe.db.set_value(
#                 "Customer Request For Quotation",
#                 self.customer_rfq_reference,
#                 "estimate_status",
#                 "Created"
#             )

#     def on_cancel(self):
#         """If Estimate is cancelled, mark CRFQ as Cancelled"""
#         if self.customer_rfq_reference:
#             frappe.db.set_value(
#                 "Customer Request For Quotation",
#                 self.customer_rfq_reference,
#                 "estimate_status",
#                 "Cancelled"
#             )

#     def on_trash(self):
#         """If Estimate is deleted, reset CRFQ to Pending"""
#         if self.customer_rfq_reference:
#             frappe.db.set_value(
#                 "Customer Request For Quotation",
#                 self.customer_rfq_reference,
#                 "estimate_status",
#                 "Pending"
#             )






import frappe
from frappe.model.document import Document
from frappe.model.mapper import get_mapped_doc

class Estimate(Document):
    def on_submit(self):
        """Mark linked CRFQ as Created when Estimate is submitted"""
        if self.customer_rfq_reference:
            frappe.db.set_value(
                "Customer Request For Quotation",
                self.customer_rfq_reference,
                "estimate_status",
                "Created"
            )

    def on_cancel(self):
        """If Estimate is cancelled, mark CRFQ as Cancelled"""
        if self.customer_rfq_reference:
            frappe.db.set_value(
                "Customer Request For Quotation",
                self.customer_rfq_reference,
                "estimate_status",
                "Cancelled"
            )

    def on_trash(self):
        """If Estimate is deleted, reset CRFQ to Pending"""
        if self.customer_rfq_reference:
            frappe.db.set_value(
                "Customer Request For Quotation",
                self.customer_rfq_reference,
                "estimate_status",
                "Pending"
            )

@frappe.whitelist()
def make_quotation(source_name, target_doc=None):
    """
    Map an Estimate to a Quotation.
    """
    doc = get_mapped_doc(
        "Estimate",
        source_name,
        {
            "Estimate": {
                "doctype": "Quotation",
                "field_map": {
                    "name": "estimate_reference",
                    "tender_id": "tender_id",
                    "customer_rfq_reference": "customer_rfq_reference"
                }
            },
            "Estimate Item": {
                "doctype": "Quotation Item",
                "field_map": {
                    "item_name": "item_name",
                    "quantity": "quantity",
                    "total_weight": "total_weight",
                    "total_cost": "total_cost"
                }
            }
        },
        target_doc
    )
    return doc
