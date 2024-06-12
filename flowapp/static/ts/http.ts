export enum HTTP_METHOD {
    GET = 'GET',
    POST = 'POST',
    PUT = 'PUT',
    DELETE = 'DELETE',
    PATCH = 'PATCH'
}

/***
 * Send FormData to a specified url. If the request is successful,
 * the `callbackSuccess` callback is called, otherwise the `callbackFail` is called.
 *
 * @param {FormData} data - data to send to the `url`.
 * @param {string} url - URL to send the data to.
 * @param {HTTP_METHOD} method - HTTP method to use to send the data.
 * */
export function sendFormDataToBackend(data: FormData, url: string, method: HTTP_METHOD): Promise<Response> {
    const requestOpts: RequestInit = {
        method: method.toString(),
        body: data
    };
    return fetch(url, requestOpts);
}
