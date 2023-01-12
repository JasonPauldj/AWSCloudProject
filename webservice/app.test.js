const request = require('supertest');
const app = require('./app.js');

describe("Health Test",()=>{
   test("should respond with a 200 status code", async ()=>{
       const response = await request(app).get("/healthz");
       expect(response.statusCode).toBe(200);
   }) 

   test("should respond with a 404 status code", async ()=>{
    const response = await request(app).get("/abcd");
    expect(response.statusCode).toBe(404);
}) 
})