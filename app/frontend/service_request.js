import {REQUEST_CATEGORIES} from "../../packages/shared/constants.js"

const categories_select = document.body.querySelector("main form select#category")
const file_input = document.body.querySelector("main form input#image")
const preview = document.body.querySelector("main form img#preview")

function preview_image(img) {
	const img_uri = URL.createObjectURL(img)
	preview.src = img_uri 
	preview.style.display = "block"
}

function fill_select_options(options) {
	categories_select.replaceChildren()
	const default_option = document.createElement("option")
	default_option.setAttribute("value", "")
	default_option.textContent = "--Please choose a category--"
	categories_select.append(default_option)
	options.forEach(option => {
		const tmp = document.createElement("option")
		tmp.setAttribute("value", option)
		tmp.textContent = option.replaceAll(
			/((^[a-z])|( [a-z]|_[a-z]))/g,
			match => match.replace("_", " ").toUpperCase()
		)
		categories_select.append(tmp)
	})
}

fill_select_options(REQUEST_CATEGORIES)
file_input.addEventListener("change", e => {
	const file = e.target.files[0]
	if (file) {
		preview_image(file)
	} else {
		preview.style.display = "none"
	}
})
