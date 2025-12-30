# bom.py

import functools
import re
from collections import deque
from operator import itemgetter

from frappe.model.mapper import get_mapped_doc
from frappe.utils import cint, cstr, flt, today

from erpnext.stock.doctype.item.item import get_item_details
from erpnext.stock.get_item_details import get_conversion_factor, get_price_list_rate


import frappe
import erpnext
from erpnext.manufacturing.doctype.bom.bom import make_variant_bom as core_make_variant_bom

@frappe.whitelist()
def make_variant_bom(source_name, item, variant_bom_name=None):
    new_bom = core_make_variant_bom(source_name, item, variant_bom_name)

    bom_doc = frappe.get_doc("BOM", new_bom) if isinstance(new_bom, str) else new_bom

    for row in bom_doc.items:
        # Only override rate if no BOM linked
        if not row.bom_no:
            row.rate = 0
            row.custom_amount_inr = 0

    bom_doc.flags.ignore_validate = True
    bom_doc.flags.ignore_permissions = True
    bom_doc.save()

    return bom_doc.name


