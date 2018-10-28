const request = require("request-promises");

module.exports = class Client {
    constructor(phone, pin) {
        this.phone = phone;
        this.pin = pin;
        this.session = '';
        this._initialized = this.getSession();
    }
    async getSession() {
        try {
            const res = await request('http://www.web2taxi.me');
            this.session = res.headers['set-cookie'][0].match(/(?!PHPSESSID=)\w+(?=;)/)[0];
        } catch (err) {
            console.log(err);
        }
    }
};