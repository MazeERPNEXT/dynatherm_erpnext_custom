# Copyright (c) 2025, maze and contributors
# For license information, please see license.txt

# import frappe
# from frappe.model.document import Document




# import frappe
# from frappe.model.document import Document
# from frappe.model.mapper import get_mapped_doc


# class CustomerRequestForQuotation(Document):
# 	pass

# @frappe.whitelist()
# def make_estimate(source_name, target_doc=None):
#     def set_missing_values(source, target):
#         target.customer_rfq = source.name
#         target.tender_id = source.crfq_id__tender_id
#         target.tag = source.tag
#         target.parent_moc = source.parent_moc

#     doc = get_mapped_doc(
#         "Customer Request For Quotation",
#         source_name,
#         {
#             "Customer Request For Quotation": {
#                 "doctype": "Estimate",
#                 "field_map": {
#                     "name": "customer_rfq",
#                     "crfq_id__tender_id": "tender_id",
#                     "tag": "tag",
#                     "parent_moc": "parent_moc"
#                 }
#             },
#             "Customer Request For Quotation Item": {
#                 "doctype": "Estimate Item",
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
# from frappe.model.mapper import get_mapped_doc


# class CustomerRequestForQuotation(Document):
#     pass


# @frappe.whitelist()
# def make_estimate(source_name, target_doc=None):
#     def set_missing_values(source, target):
#         # Link CRFQ record for reference
#         target.customer_rfq = source.name

#         # These fields exist only in CRFQ, so access safely
#         target.tender_id = getattr(source, "crfq_id__tender_id", None)
#         target.tag = getattr(source, "tag", None)
#         target.parent_moc = getattr(source, "parent_moc", None)

#         # Add a unique link field to prevent duplicates
#         if not target.get("crfq_reference"):
#             target.crfq_reference = source.name

#     doc = get_mapped_doc(
#         "Customer Request For Quotation",
#         source_name,
#         {
#             "Customer Request For Quotation": {
#                 "doctype": "Estimate",
#                 "field_map": {
#                     "name": "customer_rfq",
#                     # Remove fields that exist only in Estimate
#                     # "supplier_type": "supplier_type",
#                     # "supplier_cat": "supplier_cat",
#                     # "tag": "tag",
#                     # "parent_moc": "parent_moc"
#                 },
#             },
#             "Customer Request For Quotation Item": {
#                 "doctype": "Estimate Item",
#                 "field_map": {
#                     "item_name": "item_name",
#                     "quantity": "quantity",
#                 },
#             },
#         },
#         target_doc,
#         set_missing_values,
#     )

#     return doc






import frappe
from frappe.model.document import Document
from frappe.model.mapper import get_mapped_doc

class CustomerRequestForQuotation(Document):
    pass

@frappe.whitelist()
def make_estimate(source_name, target_doc=None):
    """Create Estimate from CRFQ only if not already created."""
    # Check if an Estimate already exists for this CRFQ
    existing_estimate = frappe.db.exists("Estimate", {"customer_rfq_reference": source_name})
    if existing_estimate:
        return frappe.get_doc("Estimate", existing_estimate)

    def set_missing_values(source, target):
        target.customer_rfq_reference = source.name
        target.tender_id = getattr(source, "crfq_id__tender_id", None)
        target.tag = getattr(source, "tag", None)
        target.parent_moc = getattr(source, "parent_moc", None)

        # Update CRFQ status
        frappe.db.set_value("Customer Request For Quotation", source.name, "estimate_status", "Created")

    doc = get_mapped_doc(
        "Customer Request For Quotation",
        source_name,
        {
            "Customer Request For Quotation": {
                "doctype": "Estimate",
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
