# import frappe
# from erpnext.manufacturing.doctype.work_order.work_order import make_work_order as original_make_work_order

# @frappe.whitelist()
# def make_work_order(source_name, target_doc=None):
#     work_order = original_make_work_order(source_name, target_doc)

#     bom_items = frappe.get_all(
#         "BOM Item",
#         filters={"parent": source_name},
#         fields=["item_name", "custom_length", "custom_width", "custom_thickness"]
#     )

#     for wo_item in work_order.items:
#         for bom_item in bom_items:
#             if bom_item.item_name == wo_item.item_name:
#                 wo_item.custom_length = bom_item.custom_length or 0
#                 wo_item.custom_width = bom_item.custom_width or 0
#                 wo_item.custom_thickness = bom_item.custom_thickness or 0

#     return work_order



import json
import frappe
from frappe import _
from dateutil.relativedelta import relativedelta
from erpnext.manufacturing.doctype.work_order.work_order import get_template_rm_item
from erpnext.stock.doctype.item.item import get_item_defaults, validate_end_of_life
from erpnext.manufacturing.doctype.work_order.work_order import get_item_details
from erpnext.manufacturing.doctype.work_order_item.work_order_item import WorkOrderItem
from erpnext.manufacturing.doctype.bom.bom import (
	get_bom_item_rate,
	get_bom_items_as_dict,
	validate_bom_no,
)
from frappe.utils import cint, flt, nowdate

@frappe.whitelist()
def make_work_order(bom_no, item, qty=0, project=None, variant_items=None, use_multi_level_bom=None):
	"""
	Custom Work Order creation that dynamically fetches
	custom_length, custom_width, and custom_thickness
	from the BOM Item linked to the selected item.
	"""
	if not frappe.has_permission("Work Order", "write"):
		frappe.throw(_("Not permitted"), frappe.PermissionError)

	item_details = get_item_details(item, project)

	wo_doc = frappe.new_doc("Work Order")
	wo_doc.production_item = item
	wo_doc.update(item_details)
	wo_doc.bom_no = bom_no
	wo_doc.use_multi_level_bom = cint(use_multi_level_bom)

	if flt(qty) > 0:
		wo_doc.qty = flt(qty)
		wo_doc.get_items_and_operations_from_bom()

		# ✅ Fetch the 3 custom values from BOM Item for this item
		bom_item = frappe.db.get_value(
			"BOM Item",
			{"parent": bom_no, "item_code": item},
			["custom_length", "custom_width", "custom_thickness"],
			as_dict=True,
		)

		if bom_item:
			# Apply to all matching required items
			for req_item in wo_doc.required_items:
				if req_item.item_code == item:
					req_item.custom_length = bom_item.custom_length or 0
					req_item.custom_width = bom_item.custom_width or 0
					req_item.custom_thickness = bom_item.custom_thickness or 0

	# Handle variant items if needed
	if variant_items and not wo_doc.use_multi_level_bom:
		add_variant_item(variant_items, wo_doc, bom_no, "required_items")

	return wo_doc


def add_variant_item(variant_items, wo_doc, bom_no, table_name="items"):
	if isinstance(variant_items, str):
		variant_items = json.loads(variant_items)

	for item in variant_items:
		args = frappe._dict(
			{
				"item_code": item.get("variant_item_code"),
				"required_qty": item.get("qty"),
				"qty": item.get("qty"),
				"source_warehouse": item.get("source_warehouse"),
				"operation": item.get("operation"),
			}
		)

		bom_doc = frappe.get_cached_doc("BOM", bom_no)
		item_data = get_item_details(args.item_code, skip_bom_info=True)
		args.update(item_data)

		args["rate"] = get_bom_item_rate(
			{
				"company": wo_doc.company,
				"item_code": args.get("item_code"),
				"qty": args.get("required_qty"),
				"uom": args.get("stock_uom"),
				"stock_uom": args.get("stock_uom"),
				"conversion_factor": 1,
			},
			bom_doc,
		)

		if not args.source_warehouse:
			args["source_warehouse"] = get_item_defaults(
				item.get("variant_item_code"), wo_doc.company
			).default_warehouse

		args["amount"] = flt(args.get("required_qty")) * flt(args.get("rate"))
		args["uom"] = item_data.stock_uom

		existing_row = (
			get_template_rm_item(wo_doc, item.get("item_code"))
			if table_name == "required_items"
			else None
		)
		if existing_row:
			existing_row.update(args)
		else:
			wo_doc.append(table_name, args)
