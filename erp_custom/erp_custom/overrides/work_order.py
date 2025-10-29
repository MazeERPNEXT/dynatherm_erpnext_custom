import json
import frappe
from frappe import _
from erpnext.manufacturing.doctype.work_order.work_order import get_template_rm_item, get_item_details
from erpnext.stock.doctype.item.item import get_item_defaults
from erpnext.manufacturing.doctype.bom.bom import get_bom_item_rate
from frappe.utils import cint, flt

@frappe.whitelist()
def make_work_order(bom_no, item, qty=0, project=None, variant_items=None, use_multi_level_bom=None):
	"""
	Custom Work Order creation that dynamically fetches
	custom_length, custom_width, and custom_thickness
	from the BOM Item linked to the selected item.
	"""
	if not frappe.has_permission("Work Order", "write"):
		frappe.throw(_("Not permitted"), frappe.PermissionError)

	# Fetch default item details
	item_details = get_item_details(item, project)

	# Create Work Order doc
	wo_doc = frappe.new_doc("Work Order")
	wo_doc.production_item = item
	wo_doc.update(item_details)
	wo_doc.bom_no = bom_no
	wo_doc.use_multi_level_bom = cint(use_multi_level_bom)

	if flt(qty) > 0:
		wo_doc.qty = flt(qty)
		wo_doc.get_items_and_operations_from_bom()

		bom_items = frappe.get_all(
			"BOM Item",
			filters={"parent": bom_no},
			fields=["item_code", "custom_length", "custom_width", "custom_thickness"]
		)

		bom_map = {bi.item_code: bi for bi in bom_items}

		for req_item in wo_doc.required_items:
			bi = bom_map.get(req_item.item_code)
			if bi:
				req_item.custom_length = bi.custom_length or 0
				req_item.custom_width = bi.custom_width or 0
				req_item.custom_thickness = bi.custom_thickness or 0

	if variant_items and not wo_doc.use_multi_level_bom:
		add_variant_item(variant_items, wo_doc, bom_no, "required_items")

	return wo_doc


def add_variant_item(variant_items, wo_doc, bom_no, table_name="items"):
	"""
	Add variant items into the Work Order dynamically.
	"""
	if isinstance(variant_items, str):
		variant_items = json.loads(variant_items)

	for item in variant_items:
		args = frappe._dict({
			"item_code": item.get("variant_item_code"),
			"required_qty": item.get("qty"),
			"qty": item.get("qty"),
			"source_warehouse": item.get("source_warehouse"),
			"operation": item.get("operation"),
		})

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
