# # bom.py

# import functools
# import re
# from collections import deque
# from operator import itemgetter

# from frappe.model.mapper import get_mapped_doc
# from frappe.utils import cint, cstr, flt, today

# from erpnext.stock.doctype.item.item import get_item_details
# from erpnext.stock.get_item_details import get_conversion_factor, get_price_list_rate


# import frappe
# import erpnext
# from erpnext.manufacturing.doctype.bom.bom import make_variant_bom as core_make_variant_bom

# @frappe.whitelist()
# def make_variant_bom(source_name, item, variant_bom_name=None):
#     new_bom = core_make_variant_bom(source_name, item, variant_bom_name)

#     bom_doc = frappe.get_doc("BOM", new_bom) if isinstance(new_bom, str) else new_bom

#     for row in bom_doc.items:
#         # Only override rate if no BOM linked
#         if not row.bom_no:
#             row.rate = 0
#             row.custom_amount_inr = 0

#     bom_doc.flags.ignore_validate = True
#     bom_doc.flags.ignore_permissions = True
#     bom_doc.save()

#     return bom_doc.name



import frappe
import erpnext
from frappe.utils import flt

@frappe.whitelist()
def get_bom_material_detail(bom, item_code, custom_total_weight=0):
    """
    This method is called from BOM Item JS
    Purpose:
    1️⃣ Confirm correct Python path using msgprint
    2️⃣ Calculate and return rate
    """

    # -------------------------------------------------------
    # 1️⃣ PATH CHECK MESSAGE (shows once per call)
    # -------------------------------------------------------
    frappe.msgprint(
        msg="✅ Python path working:<br><b>erp_custom.erp_custom.overrides.bom.get_bom_material_detail</b>",
        title="BOM Rate Override",
        indicator="green"
    )

    # -------------------------------------------------------
    # 2️⃣ Safety checks
    # -------------------------------------------------------
    if not bom or not item_code:
        return 0

    custom_total_weight = flt(custom_total_weight)

    # -------------------------------------------------------
    # 3️⃣ Fetch LAST PURCHASE RATE (example logic)
    # You can change this logic later if needed
    # -------------------------------------------------------
    rate = frappe.db.get_value(
        "Item Price",
        {
            "item_code": item_code,
            "buying": 1
        },
        "price_list_rate",
        order_by="modified desc"
    ) or 0

    rate = flt(rate)

    # -------------------------------------------------------
    # 4️⃣ OPTIONAL: Weight-based rate logic (if required)
    # Example: cost per KG
    # -------------------------------------------------------
    if custom_total_weight > 0:
        final_rate = rate
    else:
        final_rate = rate

    # -------------------------------------------------------
    # 5️⃣ Return RATE (this sets row.rate in JS)
    # -------------------------------------------------------
    return final_rate
