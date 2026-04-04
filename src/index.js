import react from 'react'
import react_dom from 'react-dom/client'
import './index.css'
import app from './app.js'
import report_web_vitals from './report_web_vitals.js'

const root = react_dom.createRoot(document.getElementById('root'))
root.render( <
	react.StrictMode >
	<
	app / >
	<
	/react.StrictMode>
)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: report_web_vitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
report_web_vitals()
