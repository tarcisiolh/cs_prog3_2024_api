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


sw.listen(4000, function () {
    console.log('Server is running.. on Port 4000');
});