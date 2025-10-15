import frappe
from erpnext.manufacturing.doctype.work_order.work_order import make_work_order as original_make_work_order

@frappe.whitelist()
def make_work_order_custom(source_name, target_doc=None):
    work_order = original_make_work_order(source_name, target_doc)

    bom_items = frappe.get_all(
        "BOM Item",
        filters={"parent": source_name},
        fields=["item_code", "custom_length", "custom_width", "custom_thickness"]
    )

    for wo_item in work_order.items:
        for bom_item in bom_items:
            if bom_item.item_code == wo_item.item_code:
                wo_item.custom_length = bom_item.custom_length or 0
                wo_item.custom_width = bom_item.custom_width or 0
                wo_item.custom_thickness = bom_item.custom_thickness or 0

    return work_order
