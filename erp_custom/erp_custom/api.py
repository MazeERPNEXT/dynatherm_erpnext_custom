# import frappe

# @frappe.whitelist()
# def get_items_from_stock_entry(stock_entry):
#     stock_doc = frappe.get_doc("Stock Entry", stock_entry)
#     items = []
#     for d in stock_doc.items:
#         items.append({
#             "item_code": d.item_code,
#             "qty": d.qty,
#             "uom": d.uom,
#             "work_order": stock_doc.work_order, 
#             "custom_length": d.custom_length,
#             "custom_width": d.custom_width,
#             "custom_thickness": d.custom_thickness
#         })
#     return items
