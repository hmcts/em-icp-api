const request = require('superagent')

export async function getUserInfo(self, securityCookie) {
    return request.get(`${self}/o/userinfo`)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${securityCookie}`)
}