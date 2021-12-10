const express = require('express');
const {v4: uuidv4} = require("uuid")

const app = express();

app.use(express.json());

const customers = [];

function checarContaPorCPF(request, response, next){
    const {cpf} = request.headers;

    const customer = customers.find(customer => customer.cpf === cpf);

    if(!customer){
        return response.status(400).json({error: "Usuário não encontrado"});
    }

    request.customer = customer;

    return next();
}

function getBalance(statement){
    const balance = statement.reduce((acum, operation) => {
        if(operation.type === 'credit'){
            return acum + operation.amount;
        }else{
            return acum - operation.amount;
        }
    }, 0)

    return balance;
}

app.post("/account", (request, response) => {
    const {cpf, name} = request.body;
    
    const customersExists = customers.some(
        (customer) => customer.cpf === cpf
    );

    if (customersExists){
        return response.status(400).json({error: "CPF já cadastrado no sistema."});
    }

    const id = uuidv4();

    customers.push({
        cpf,
        name,
        id: uuidv4(),
        statement: []
    });
    return response.status(201).send();
});

app.put("/account", checarContaPorCPF, (request, response) => {
    const {name} = request.body;
    const {customer} = request;

    customer.name = name;

    return response.status(200).send();
})

app.get("/account", checarContaPorCPF, (request, response) => {
    const {customer} = request;

    return response.json(customer);
});

app.get("/statement", checarContaPorCPF, (request, response) => {

    const {customer} = request;

   return response.json(customer.statement);
});

app.get("/statement/date", checarContaPorCPF, (request, response) => {

    const {customer} = request;

    const {date} = request.query;

    const dateFormat = new Date(date + " 00:00");

    const statement = customer.statement.filter(
    (statement) => 
    statement.created_at.toDateString() === 
    new Date(dateFormat).toDateString()
    );

   return response.json(statement);
});

app.post("/deposit", checarContaPorCPF, (request, response) => {

    const {description, amount} = request.body;

    const {customer} = request;

    const statementOperation = {
        description,
        amount,
        created_at: new Date(),
        type: "credit"
    }

    customer.statement.push(statementOperation);

    return response.status(201).send();

});

app.post("/withdraw", checarContaPorCPF, (request, response) =>{
    const {amount} = request.body;

    const {customer} = request;

    const balance = getBalance(customer.statement);

    if(balance < amount){
        return response.status(400).json({error: "Saldo insuficiente."})
    }

    const statementOperation = {
        amount,
        created_at: new Date(),
        type: "debit"
    }

    customer.statement.push(statementOperation);

    return response.status(201).send();
})

app.get("/balance", checarContaPorCPF, (request, response) => {
    const {customer} = request;

    const balance = getBalance(customer.statement);

    return response.json(balance);
});    

app.delete("/account", checarContaPorCPF, (request, response) => {
    const {customer} = request;

    customers.splice(customer, 1);

    return response.status(200).json(customers);
})

app.listen(3000);