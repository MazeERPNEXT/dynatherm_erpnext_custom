from frappe import _


def get_data():
	return {
		"fieldname": "prevdoc_docname",
		"non_standard_fieldnames": {
			"Auto Repeat": "reference_document",
		},
		"transactions": [
			{"label": _("Customer Request For Quotation"), "items": ["Customer Request For Quotation"]},
			{"label": _("Estimate"), "items": ["Estimate"]},
			{"label": _("Quotation"), "items": ["Quotation"]},
		],
	}
