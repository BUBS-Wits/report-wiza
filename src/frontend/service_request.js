const file_input = document.body.querySelector("main input#image")
const preview = document.body.querySelector("main img#preview")

function preview_image(img) {
	const img_uri = URL.createObjectURL(img)
	preview.src = img_uri 
	preview.style.display = "block"
}

file_input.addEventListener("change", e => {
	const file = e.target.files[0]
	if (file) {
		preview_image(file)
	} else {
		preview.style.display = "none"
	}
})
