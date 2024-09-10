var express = require('express'); // requisita a biblioteca para a criacao dos serviços web.
var pg = require("pg"); // requisita a biblioteca pg para a comunicacao com o banco de dados.

var sw = express(); // iniciliaza uma variavel chamada app que possitilitará a criação dos serviços e rotas.
sw.use(express.json());//padrao de mensagens em json.
//permitir o recebimento de qualquer origem, aceitar informações no cabeçalho e permitir o métodos get e post
sw.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET,POST');
    next();
});

const config = {
    host: 'localhost',
    user: 'postgres',
    database: 'DB_CS_2024',
    password: 'postgres',
    port: 5432
};

//definia conexao com o banco de dados.
const postgres = new pg.Pool(config);

//definicao do primeiro serviço web.
sw.get('/', (req, res) => {
    res.send('Hello darkness my old friend.  #####');
})

sw.get('/listenderecos', function (req, res, next) {

    postgres.connect(function (err, client, done) {

        if (err) {

            console.log("Nao conseguiu acessar o  BD " + err);
            res.status(400).send('{' + err + '}');
        } else {

            var q = 'select * from tb_endereco';

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

            var q = "select codigo,nome,quant_min_pontos,cor,logotipo,to_char(datacriacao, 'dd/mm/yyyy hh24:mi:ss') " +
                "as datacriacao from tb_patente order by quant_min_pontos asc;"

            client.query(q, function (err, result) {
                done(); // closing the connection;
                if (err) {
                    console.log('retornou 400 no listpatente');
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

            var q = "select nickname,senha,quantpontos,quantdinheiro,to_char(datacadastro, 'dd/mm/yyyy hh24:mi:ss') " +
                "as datacadastro,to_char(data_ultimo_login, 'dd/mm/yyyy hh24:mi:ss') as data_ultimo_login,situacao," +
                " 0 as patentes, 0 as endereco from tb_jogador j order by nickname asc"

            client.query(q, async function (err, result) {
                if (err) {

                    res.status(400).send('{' + err + '}');
                } else {

                    for (var i = 0; i < result.rows.length; i++) {
                        try {
                            pj = await client.query('select codpatente from'
                                + ' tb_jogador_conquista_patente '
                                + 'where nickname = $1', [result.rows[i].nickname])
                            result.rows[i].patentes = pj.rows;
                        } catch (err) {
                            res.status(400).send('{' + err + '}')
                        }

                    };

                    for (var i = 0; i < result.rows.length; i++) {
                        try {
                            ej = await client.query('select * from'
                                + ' tb_endereco '
                                + 'where nicknamejogador = $1', [result.rows[i].nickname])
                            result.rows[i].endereco = ej.rows;
                        } catch (err) {

                            res.status(400).send('{' + err + '}')
                        }
                    };
                    done(); // closing the connection;
                    res.status(201).send(result.rows);
                }
            });
        }
    });
});

sw.post('/insertjogador', function (req, res, next) {

    postgres.connect(function (err, client, done) {

        if (err) {

            console.log("Nao conseguiu acessar o  BD " + err);
            res.status(400).send('{' + err + '}');
        } else {

            var q1 = {
                text: 'insert into tb_jogador (nickname, senha, quantpontos, quantdinheiro, datacadastro, situacao) ' +
                    ' values ($1,$2,$3,$4,now(), $5) ' +
                    'returning nickname, senha, quantpontos, quantdinheiro, ' +
                    ' to_char(datacadastro, \'dd/mm/yyyy\') as datacadastro, ' +
                    ' to_char(data_ultimo_login, \'dd/mm/yyyy\') as data_ultimo_login, situacao;',
                values: [req.body.nickname,
                req.body.senha,
                req.body.quantpontos,
                req.body.quantdinheiro,
                req.body.situacao == true ? "A" : "I"]
            }
            console.log(q1);

            client.query(q1, function (err, result1) {
                if (err) {
                    console.log('retornou 400 no insert q1');
                    res.status(400).send('{' + err + '}');
                } else {
                    var q2 = {
                        text: 'insert into tb_endereco (complemento, cep, nicknamejogador) values ($1, $2, $3) returning codigo, complemento, cep;',
                        values: [req.body.endereco.complemento,
                        req.body.endereco.cep,
                        req.body.nickname]
                    }
                    client.query(q2, async function (err, result2) {
                        if (err) {
                            console.log('retornou 400 no insert q2');
                            res.status(400).send('{' + err + '}');
                        } else {

                            //insere todas as pantentes na tabela associativa.
                            for (var i = 0; i < req.body.patentes.length; i++) {

                                try {

                                    await client.query('insert into tb_jogador_conquista_patente (codpatente, nickname) values ($1, $2)', [req.body.patentes[i].codigo, req.body.nickname])

                                } catch (err) {

                                    res.status(400).send('{' + err + '}');
                                }

                            }

                            done(); // closing the connection;
                            console.log('retornou 201 no insertjogador');
                            res.status(201).send({
                                "nickname": result1.rows[0].nickname,
                                "senha": result1.rows[0].senha,
                                "quantpontos": result1.rows[0].quantpontos,
                                "quantdinheiro": result1.rows[0].quantdinheiro,
                                "situacao": result1.rows[0].situacao,
                                "datacadastro": result1.rows[0].datacadastro,
                                "data_ultimo_login": result1.rows[0].data_ultimo_login,
                                "endereco": { "codigo": result2.rows[0].codigo, "cep": result2.rows[0].cep, "complemento": result2.rows[0].complemento },
                                "patentes": req.body.patentes
                            });
                        }
                    });
                }
            });
        }
    });
});
sw.post('/updatejogador', function (req, res, next) {

    postgres.connect(function (err, client, done) {

        if (err) {

            console.log("Nao conseguiu acessar o  BD " + err);
            res.status(400).send('{' + err + '}');
        } else {

            var q1 = {
                text: 'update tb_jogador set senha = $1, quantpontos = $2, quantdinheiro = $3, situacao = $4 where nickname = $5 ' +
                    'returning nickname, senha, quantpontos, quantdinheiro, to_char(datacadastro, \'dd/mm/yyyy\') as datacadastro, situacao;',
                values: [
                    req.body.senha,
                    req.body.quantpontos,
                    req.body.quantdinheiro,
                    req.body.situacao,
                    req.body.nickname]
            }
            var q2 = {
                text: 'update tb_endereco set complemento = $1, cep = $2 where nicknamejogador = $3 returning codigo, complemento, cep;',
                values: [req.body.endereco.complemento,
                req.body.endereco.cep,
                req.body.nickname]
            }
            console.log(q1);
            console.log(q2);

            client.query(q1, function (err, result1) {
                if (err) {
                    console.log('retornou 400 no update');
                    console.log(err)
                    res.status(400).send('{' + err + '}');
                } else {
                    client.query(q2, async function (err, result2) {
                        if (err) {
                            console.log(err);
                            console.log('retornou 400 no updatejogador');
                            res.status(400).send('{' + err + '}');
                        } else {


                            try {
                                //remove todas as patentes
                                await client.query('delete from tb_jogador_conquista_patente jp where jp.nickname = $1', [req.body.nickname])

                                //insere todas as pantentes na tabela associativa.
                                for (var i = 0; i < req.body.patentes.length; i++) {

                                    try {

                                        await client.query('insert into tb_jogador_conquista_patente (codpatente, nickname) values ($1, $2)', [req.body.patentes[i].codpatente, req.body.nickname])

                                    } catch (err) {

                                        res.status(400).send('{' + err + '}');
                                    }

                                }

                            } catch (err) {

                                res.status(400).send('{' + err + '}');
                            }




                            done(); // closing the connection;

                            console.log('retornou 201 no updatejogador');
                            res.status(201).send({
                                "nickname": result1.rows[0].nickname,
                                "senha": result1.rows[0].senha,
                                "quantpontos": result1.rows[0].quantpontos,
                                "quantdinheiro": result1.rows[0].quantdinheiro,
                                "situacao": result1.rows[0].situacao,
                                "datacadastro": result1.rows[0].datacadastro,
                                "data_ultimo_login": result1.rows[0].data_ultimo_login,
                                "endereco": { "codigo": result2.rows[0].codigo, "cep": result2.rows[0].cep, "complemento": result2.rows[0].complemento },
                                "patentes": req.body.patentes
                            });
                        }
                    });
                }
            });
        }
    });
});

sw.post('/insertpatente', function (req, res, next) {

    postgres.connect(function (err, client, done) {

        if (err) {

            console.log("Nao conseguiu acessar o  BD " + err);
            res.status(400).send('{' + err + '}');
        } else {

            var q1 = {
                text: 'insert into tb_patente (nome,quant_min_pontos,datacriacao,cor,logotipo) ' +
                    'values ($1,$2,now(),$3,$4) ' +
                    'returning codigo,nome, quant_min_pontos, ' +
                    'to_char(datacriacao, \'dd/mm/yyyy\') as datacriacao, cor, logotipo',
                values: [
                    req.body.nome,
                    req.body.quant_min_pontos,
                    req.body.cor,
                    req.body.logotipo]
            }
            /*var q2 = {
                text : 'insert into tb_endereco (complemento, cep, nicknamejogador) values ($1, $2, $3) returning codigo, complemento, cep;',
                values: [req.body.endereco.complemento, 
                         req.body.endereco.cep, 
                         req.body.nickname]
            }*/
            console.log(q1);

            client.query(q1, function (err, result1) {
                if (err) {
                    console.log('retornou 400 no insert q1');
                    res.status(400).send('{' + err + '}');
                } else {

                    done(); // closing the connection;
                    console.log('retornou 201 no insertpatente');
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
    console.log('Server tá rodando meu chapa.. na Porta 4000');
});