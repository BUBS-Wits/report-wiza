import {REQUEST_CATEGORIES} from "../../packages/shared/constants.js"
// const {REQUEST_CATEGORIES} = require("../../packages/shared/constants.js")

let categories_select, file_input, preview
if (typeof window !== "undefined" && typeof document !== "undefined") {
	categories_select = document.body.querySelector("main form select#category")
	file_input = document.body.querySelector("main form input#image")
	preview = document.body.querySelector("main form img#preview")
	fill_select_options(document, categories_select, REQUEST_CATEGORIES)
}

function preview_image(img) {
	const img_uri = URL.createObjectURL(img)
	preview.src = img_uri 
	preview.style.display = "block"
}

export function fill_select_options(dom, select, options) {
	if (!select || typeof dom === "undefined")
		return
	select.replaceChildren()
	const default_option = dom.createElement("option")
	default_option.setAttribute("value", "")
	default_option.textContent = "--Please choose a category--"
	select.append(default_option)
	options.forEach(option => {
		const tmp = dom.createElement("option")
		tmp.setAttribute("value", option)
		tmp.textContent = option.replaceAll(
			/((^[a-z])|( [a-z]|_[a-z]))/g,
			match => match.replace("_", " ").toUpperCase()
		)
		select.append(tmp)
	})
}

file_input?.addEventListener("change", e => {
	const file = e.target.files[0]
	if (file) {
		preview_image(file)
	} else {
		preview.style.display = "none"
	}
})

