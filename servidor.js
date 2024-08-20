var express = require('express');
var pg = require("pg");

var sw = express();

sw.use(express.json());

sw.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET,POST');
    next();
});

const config = {
    host: 'localhost',
    user: 'postgres',
    database: 'db_cs_2024',
    password: 'postgres',
    port: 5432
};

//definia conexao com o banco de dados.
const postgres = new pg.Pool(config);

//definicao do primeiro serviço web.
sw.get('/', (req, res) => {
    res.send('Hello, world! meu primeiro teste.  #####');
})

sw.get('/teste', (req, res) => {
    res.send('ishi.  #####');
})

sw.get('/listendereco', function (req, res, next) {

    postgres.connect(function (err, client, done) {

        if (err) {

            console.log("Nao conseguiu acessar o  BD " + err);
            res.status(400).send('{' + err + '}');
        } else {

            var q = 'select codigo, complemento, cep, nicknamejogador' + ' from tb_endereco order by codigo asc'

            client.query(q, function (err, result) {
                done(); // closing the connection;
                if (err) {
                    console.log('retornou 400 no listendereco');
                    console.log(err);

                    res.status(400).send('{' + err + '}');
                } else {

                    //console.log('retornou 201 no /listendereco');
                    res.status(201).send(result.rows);
                }
            });
        }
    });
});

sw.get('/listpatentes', function (req, res, next) {

    postgres.connect(function (err, client, done) {

        if (err) {

            console.log("Nao conseguiu acessar o  BD " + err);
            res.status(400).send('{' + err + '}');
        } else {

            var q = 'select codigo, nome, quant_min_pontos, to_char(datacriacao, \'dd/mm/yyyy hh24:mi:ss\') as descricao, cor, logotipo ' + ' from tb_patente order by codigo asc'

            client.query(q, function (err, result) {
                done(); // closing the connection;
                if (err) {
                    console.log('retornou 400 no listpatentes');
                    console.log(err);

                    res.status(400).send('{' + err + '}');
                } else {

                    //console.log('retornou 201 no /listendereco');
                    res.status(201).send(result.rows);
                }
            });
        }
    });
});

sw.get('/listjogadores', function (req, res, next) {

    postgres.connect(function (err, client, done) {

        if (err) {

            console.log("Nao conseguiu acessar o  BD " + err);
            res.status(400).send('{' + err + '}');
        } else {

            var q = "select nickname,senha,quantpontos,quantdinheiro,to_char(datacadastro, 'dd/mm/yyyy hh24:mi:ss') as datacadastro,to_char(data_ultimo_login, 'dd/mm/yyyy hh24:mi:ss') as data_ultimo_login,situacao, 0 as patentes, e.cep, e.complemento from tb_jogador j, tb_endereco e where e.nicknamejogador=j.nickname order by nickname asc"
                
            client.query(q,async function (err, result) {
                                if (err) {
                    console.log('retornou 400 no listjogadores');
                    console.log(err);

                    res.status(400).send('{' + err + '}');
                } else {

                   for(var i=0; i<result.rows.length; i++){
                        try{
                            pj = await client.query('select codpatente from'
                           + ' tb_jogador_conquista_patente '
                             + 'where nickname = $1', [result.rows[i].nickname])
                             result.rows[i].patentes = pj.rows;
                        } catch(err){
                            res.status(400).send('{'+err+'}')
                        }
                    }
                    done(); // closing the connection;
                    res.status(201).send(result.rows);
                }
            });
        }
    });
});
sw.post('/insertpatente', function (req, res, next) {
    
    postgres.connect(function(err,client,done) {

       if(err){

           console.log("Nao conseguiu acessar o  BD "+ err);
           res.status(400).send('{'+err+'}');
       }else{            

            var q ={
                text: 'insert into tb_patente (nome, quant_min_pontos , datacriacao, cor, logotipo) ' +
                ' values ($1,$2,now(),$3,$4) ' +
                                            'returning codigo, nome, quant_min_pontos,' +
                                            ' to_char(datacriacao, \'dd/mm/yyyy\') as datacadastro, cor, logotipo;',
                values: [req.body.nome, 
                         req.body.quant_min_pontos, 
                         req.body.cor,
                         req.body.logotipo]
            }
            console.log(q);

            client.query(q, function(err,result) {
                if(err){
                    console.log('retornou 400 no insert q');
                    res.status(400).send('{'+err+'}');
                }else{
                    
                        
                            //insere todas as pantentes na tabela associativa.                         

                            done(); // closing the connection;
                            console.log('retornou 201 no insertpatente');
                            res.status(201).send({"codigo" : result.rows[0].codigo, 
                             "nome" : result.rows[0].nome, 
                                                  "quant_min_pontos": result.rows[0].quant_min_pontos, 
                                                  "datacadastro": result.rows[0].datacadastro, 
                                                  "cor": result.rows[0].cor,
                                                  "logotipo": result.rows[0].logotipo,});
                        }
                    });
                }           
            });
       }       
    );
    sw.post('/updatepatente', function (req, res, next) {

        postgres.connect(function (err, client, done) {
    
            if (err) {
    
                console.log("Nao conseguiu acessar o  BD " + err);
                res.status(400).send('{' + err + '}');
            } else {
    
                var q1 = {
                    text: 'update tb_patente set nome = $1, quant_min_pontos = $2, cor = $3, logotipo = $4 where codigo = $5 ' +
                        'returning codigo, nome, quant_min_pontos, to_char(datacriacao, \'dd/mm/yyyy\') as datacriacao, cor, logotipo;',
                    values: [
                        req.body.nome,
                        req.body.quant_min_pontos,
                        req.body.cor,
                        req.body.logotipo,
                        req.body.codigo]
                }
    
                console.log(q1);
    
                client.query(q1, function (err, result1) {
                    if (err) {
                        console.log('retornou 400 no update');
                        console.log(err)
                        res.status(400).send('{' + err + '}');
                    } else {
                        done(); // closing the connection;
                        console.log('retornou 201 no updatejogador');
                        res.status(201).send({
                            "codigo": result1.rows[0].codigo,
                            "nome": result1.rows[0].nome,
                            "quant_min_pontos": result1.rows[0].quant_min_pontos,
                            "cor": result1.rows[0].cor,
                            "logotipo": result1.rows[0].logotipo
                        });
    
                    }
                });
            }
        });
    });
    sw.get('/deletepatente/:codigo', (req, res) => {
    
        postgres.connect(function (err, client, done) {
            if (err) {
                console.log("Não conseguiu acessar o banco de dados!" + err);
                res.status(400).send('{' + err + '}');
            } else {
    
                var q0 = {
                    text: 'delete FROM tb_jogador_conquista_patente where codpatente = $1 returning codpatente',
                    values: [req.params.codigo]
                }
    
                var q1 = {
                    text: 'delete FROM tb_patente where codigo = $1 returning codigo',
                    values: [req.params.codigo]
                }
    
    
                client.query(q0, function (err, result) {
    
                    if (err) {
                        console.log(err);
                        res.status(400).send('{' + err + '}');
                    } else {
    
                        client.query(q1, function (err, result) {
    
                            if (err) {
                                console.log(err);
                                res.status(400).send('{' + err + '}');
                            } else {
                                res.status(200).send({ 'codigo': req.params.codigo });
                            }
                        });
    
    
                    }
    
                });
    
    
            }
        });
    });

sw.listen(4000, function () {
    console.log('Server is running.. on Port 4000');
});