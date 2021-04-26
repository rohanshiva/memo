import defaultAPI from './api';
import basedbAPI from './baseApi';

function getCookieValue(a) {
	var b = document.cookie.match('(^|;)\\s*' + a + '\\s*=\\s*([^;]+)')
	return b ? b.pop() : null
}
export const runningOnMicros = getCookieValue("pk");
export const API = runningOnMicros ? basedbAPI : defaultAPI;
