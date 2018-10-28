const request = require("request-promises").defaults({ jar: true/*, 'proxy': 'http://localhost:8888'*/ });
const xml2js = require("xml2js");

module.exports = class Client {
    constructor(phone, pin) {
        this.phone = phone;
        this.pin = pin;
        this.address = '';
        this.waitingTime = null;
        this.carNumber = null;
        this.timeLeft = null;
        this.state = null;
        //this.session = '';
        //this._initialized = this.setUp();
    }
    get loginRequestForm() {
        return {
            form: {
                listprov: 0,
                myusername: this.phone,
                mypassword: this.pin,
                submitlogin_pc: 'Posalji'
            }
        }
    }
    get carRequestForm() {
        return {
            form: {
                mydestination: this.address.replace(' ','+'),
                submitdest:'Posalji'
            }
        }
    }
    get randomNumber() {
        return parseInt(Math.random() * 999999999999999, 10);
    }
    get statusMessage() {
        switch(this.statusCode){
            case 0: 'Car request sent, not received yet'; break;
            case 1: 'Car request received, waiting for response'; break;
            case 2: 'Car is on the way'; break;
            case 3: 'No cars available'; break;
            case 4: 'Undefined'; break; //Unknown
            case 5: 'Extra time, undefined behavior'; break;
            case 6: 'No response from operator'; break;
            case null: 'Car request not sent yet'; break;
            default: 'Invalid response from operator'; break;
        }
    }
    async setUp() {
        try {
            const res = await request('http://www.web2taxi.me');
            //this.session = res.headers['set-cookie'][0].match(/(?!PHPSESSID=)\w+(?=;)/)[0];
        } catch (err) {
            throw new Error(`Could not connect to host to get session: ${err}`);
        }
        try {
            const res = await request.post('http://www.web2taxi.me/mainchecklogin.php', this.loginRequestForm);
        } catch (err) {
            throw new Error(`Could not connect to login endpoint: ${err}`);
        }
        try {
            const res = await request('http://www.web2taxi.me/19700/desktop_booking.php');
            if (res.statusCode === 200)
                console.log('Successful login with provided credentials');
            else
                throw new Error('Could not login with provided credentials');
        } catch (err) {
            throw new Error(`Could not connect to car request endpoint to check login: ${err}`);
        }
    }
    async requestCar(address) {
        this.address = address;
        try {
            const res = await request.post('http://www.web2taxi.me/19700/sendrequest.php', this.carRequestForm);
        } catch (err) {
            throw new Error(`Could not connect to car request endpoint: ${err}`);
        }
    }
    async checkStatus() {
        try {
            const res = await request.post('http://www.web2taxi.me/19700/phpsqlajax_operrsp.php?rand=' + this.randomNumber);
            const options = {
                normalize: true,
                explicitArray: false,
                valueProcessors: [ xml2js.processors.parseNumbers ]
            };
            xml2js.parseString(res, options, (err, result) => {
                if (err)
                    throw new Error(`Invalid response, could not parse XML: ${err}`);
                let data = result.res;
                this.waitingTime = data.ttw <= 2 ? null : data.ttw; //Default value is 2
                this.carNumber = data.carsent <= 0 ? null : data.carsent; //carsent is car number; -1: waiting; 0: no car
                this.timeLeft = data.cdown;
                this.state = data.stat;
            });
        } catch (err) {
            throw new Error(`Could not connect to car request endpoint: ${err}`);
        }
    }
};