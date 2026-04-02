import { useState } from 'react'
import { Plus, Search, Printer, Filter, ChevronLeft, ChevronRight, X, Save, Building2, RotateCcw } from 'lucide-react'

const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DIAS = ['Não entrega','Todo dia 1','Todo dia 2','Todo dia 3','Todo dia 4','Todo dia 5','Todo dia 7','Todo dia 10','Todo dia 12','Todo dia 15','Todo dia 20','Todo dia 25','Todo dia 28','Todo dia 30','Todo dia 31','1°DU','2°DU','3°DU','4°DU','5°DU','10°DU','15°DU','20°DU','Último DU']
const COMPETENCIAS = ['Mesmo mês','Mês anterior','Mês seguinte','2 meses antes','Ano anterior']
const LEMBRAR = ['0 dias antes','1 dia antes','2 dias antes','3 dias antes','4 dias antes','5 dias antes','7 dias antes','10 dias antes','15 dias antes','20 dias antes','30 dias antes']
const DEPTOS = ['Contábil - Eduardo Pimentel','Contábil 2 - Eduardo Pimentel','Fiscal - Eduardo Pimentel','Pessoal - Eduardo Pimentel','Bancos - Eduardo Pimentel','Societário - Eduardo Pimentel','Tributário - Eduardo Pimentel']
const PRAZOS = ['Antecipar para o dia útil anterior','Postergar para o dia útil seguinte','Manter na data']

const emptyForm = {
  nome:'', mininome:'', departamento:'Fiscal - Eduardo Pimentel', tempo_previsto:0,
  entregas:Array(12).fill('Todo dia 20'),
  lembrar:'5 dias antes', tipo_dias:'Dias corridos', prazos_fixos:'Antecipar para o dia útil anterior',
  sabado_util:'Não', competencia_ref:'Mês anterior', exigir_robo:'Não',
  passivel_multa:'Não', alerta_guia:'Sim', ativa:'Sim', comentario:'',
}

const D = (v) => Array(12).fill(v)
const DX = (arr) => arr // array personalizado por mês

const OBRIGACOES = [
  { id:1,  nome:'COAF',                                  depto:'Contábil',  emp:0,   dias:['ÚltDU','—','—','—','—','—','—','—','—','—','—','—'], multa:'Não',robo:'Não',comp:'Ano anterior',   lembrar:'5 dias antes' },
  { id:2,  nome:'Comprovante de Rendimento',             depto:'Pessoal',   emp:0,   dias:['—','ÚltDU','—','—','—','—','—','—','—','—','—','—'], multa:'Não',robo:'Não',comp:'Ano anterior',   lembrar:'10 dias antes'},
  { id:3,  nome:'Contrato de Trabalho Experiencia',      depto:'Pessoal',   emp:0,   dias:D('20°DU'),                                            multa:'Sim',robo:'Não',comp:'Mesmo mês',      lembrar:'4 dias antes' },
  { id:4,  nome:'Contribuição Assistencial',             depto:'Pessoal',   emp:3,   dias:['—','—','5°DU','5°DU','5°DU','5°DU','5°DU','5°DU','5°DU','5°DU','5°DU','5°DU'], multa:'Não',robo:'Não',comp:'Mês anterior',  lembrar:'5 dias antes' },
  { id:5,  nome:'CSRF - Serviços Tomados',               depto:'Fiscal',    emp:12,  dias:D('20'),                                               multa:'Sim',robo:'Não',comp:'Mês anterior',   lembrar:'10 dias antes'},
  { id:6,  nome:'DAE - Doméstico',                       depto:'Pessoal',   emp:0,   dias:D('7'),                                                multa:'Não',robo:'Não',comp:'Mês anterior',   lembrar:'4 dias antes' },
  { id:7,  nome:'DARF - Cofins - Trimestral',            depto:'Fiscal',    emp:30,  dias:D('25'),                                               multa:'Sim',robo:'Não',comp:'Mês anterior',   lembrar:'5 dias antes' },
  { id:8,  nome:'DARF - CSLL - Cota',                   depto:'Fiscal',    emp:3,   dias:D('31'),                                               multa:'Sim',robo:'Não',comp:'Mesmo mês',      lembrar:'5 dias antes' },
  { id:9,  nome:'DARF - CSLL - Trimestral',             depto:'Fiscal',    emp:55,  dias:['ÚltDU','—','—','ÚltDU','—','—','ÚltDU','—','—','25','25','25'], multa:'Não',robo:'Não',comp:'Mês anterior',lembrar:'5 dias antes'},
  { id:10, nome:'DARF - IRPJ - Cota',                   depto:'Fiscal',    emp:4,   dias:D('31'),                                               multa:'Não',robo:'Não',comp:'Mês anterior',   lembrar:'5 dias antes' },
  { id:11, nome:'DARF - IRPJ - Trimestral',             depto:'Fiscal',    emp:55,  dias:['ÚltDU','—','—','ÚltDU','—','—','ÚltDU','—','—','25','25','25'], multa:'Não',robo:'Não',comp:'Mês anterior',lembrar:'5 dias antes'},
  { id:12, nome:'DARF - IRRF Retido Aluguel',           depto:'Fiscal',    emp:0,   dias:['20','19','20','20','20','20','20','20','19','20','20','20'], multa:'Não',robo:'Não',comp:'Mês anterior',lembrar:'5 dias antes'},
  { id:13, nome:'DARF - PIS - Trimestral',              depto:'Fiscal',    emp:30,  dias:D('25'),                                               multa:'Sim',robo:'Não',comp:'Mês anterior',   lembrar:'10 dias antes'},
  { id:14, nome:'DARF - RET',                           depto:'Fiscal',    emp:15,  dias:D('20'),                                               multa:'Sim',robo:'Sim',comp:'Mês anterior',   lembrar:'5 dias antes' },
  { id:15, nome:'DAS - Mensal',                         depto:'Fiscal',    emp:93,  dias:D('20'),                                               multa:'Sim',robo:'Não',comp:'Mês anterior',   lembrar:'5 dias antes' },
  { id:16, nome:'DAS MEI - Mensal',                     depto:'Fiscal',    emp:0,   dias:D('20'),                                               multa:'Não',robo:'Não',comp:'Mês anterior',   lembrar:'15 dias antes'},
  { id:17, nome:'DASN - SIMEI',                         depto:'Fiscal',    emp:1,   dias:['—','—','—','—','ÚltDU','—','—','—','—','—','—','—'], multa:'Não',robo:'Não',comp:'Ano anterior',   lembrar:'5 dias antes' },
  { id:18, nome:'DCTFWEB - RECIBO',                     depto:'Pessoal',   emp:38,  dias:D('15'),                                               multa:'Sim',robo:'Não',comp:'Mês anterior',   lembrar:'4 dias antes' },
  { id:19, nome:'Declaração do IR Pessoa Física',       depto:'Contábil',  emp:2,   dias:['—','—','—','ÚltDU','—','—','—','—','—','—','—','—'], multa:'Não',robo:'Não',comp:'Ano anterior',   lembrar:'5 dias antes' },
  { id:20, nome:'Declaração Sociedade Uniprofissional', depto:'Fiscal',    emp:0,   dias:['—','—','—','—','—','—','—','—','—','—','—','ÚltDU'], multa:'Não',robo:'Não',comp:'Mês anterior',   lembrar:'5 dias antes' },
  { id:21, nome:'DEFIS - Simples Nacional',             depto:'Fiscal',    emp:94,  dias:['—','—','ÚltDU','—','—','—','—','—','—','—','—','—'], multa:'Não',robo:'Sim',comp:'Ano anterior',   lembrar:'5 dias antes' },
  { id:22, nome:'Demonstrativo FGTS Rescisório',        depto:'Pessoal',   emp:0,   dias:D('7'),                                                multa:'Não',robo:'Não',comp:'Mês anterior',   lembrar:'4 dias antes' },
  { id:23, nome:'DeSTDA',                               depto:'Fiscal',    emp:2,   dias:D('ÚltDU'),                                            multa:'Não',robo:'Não',comp:'Mês anterior',   lembrar:'5 dias antes' },
  { id:24, nome:'Diferencial de Alíquotas',             depto:'Fiscal',    emp:1,   dias:D('3'),                                                multa:'Não',robo:'Não',comp:'Mês anterior',   lembrar:'5 dias antes' },
  { id:25, nome:'DIME',                                 depto:'Fiscal',    emp:1,   dias:D('10'),                                               multa:'Não',robo:'Não',comp:'Mês anterior',   lembrar:'2 dias antes' },
  { id:26, nome:'DIMOB - Declaração Inf. Imobiliária',  depto:'Fiscal',    emp:5,   dias:['—','28','—','—','—','—','—','—','—','—','—','—'],    multa:'Não',robo:'Não',comp:'Ano anterior',   lembrar:'5 dias antes' },
  { id:27, nome:'DIPAM - PMSP',                         depto:'Fiscal',    emp:0,   dias:D('16'),                                               multa:'Não',robo:'Não',comp:'Mês anterior',   lembrar:'5 dias antes' },
  { id:28, nome:'DIRF - Declaração de Retenções',       depto:'Pessoal',   emp:106, dias:['—','28','—','—','—','—','—','—','—','—','—','—'],    multa:'Não',robo:'Não',comp:'Ano anterior',   lembrar:'30 dias antes'},
  { id:29, nome:'DIRF - IR Retido na Fonte',            depto:'Pessoal',   emp:21,  dias:['—','ÚltDU','—','—','—','—','—','—','—','—','—','—'],multa:'Não',robo:'Não',comp:'Ano anterior',   lembrar:'10 dias antes'},
  { id:30, nome:'DMED - Declaração Médicos e Odontólogos',depto:'Fiscal',  emp:0,   dias:['—','28','—','—','—','—','—','—','—','—','—','—'],    multa:'Não',robo:'Não',comp:'Ano anterior',   lembrar:'5 dias antes' },
  { id:31, nome:'DMS - Relatório de Notas Fiscais NFSE',depto:'Fiscal',    emp:12,  dias:['10°DU','10','10','10','10','10','10','10','10','10','10','10'], multa:'Não',robo:'Não',comp:'Mês anterior',lembrar:'5 dias antes'},
  { id:32, nome:'DUAM ISS Próprio',                     depto:'Fiscal',    emp:3,   dias:D('10'),                                               multa:'Sim',robo:'Não',comp:'Mês anterior',   lembrar:'5 dias antes' },
  { id:33, nome:'e-Social',                             depto:'Pessoal',   emp:15,  dias:D('15'),                                               multa:'Não',robo:'Não',comp:'Mês anterior',   lembrar:'4 dias antes' },
  { id:34, nome:'EFD Contribuições - Mensal',           depto:'Fiscal',    emp:65,  dias:D('10°DU'),                                            multa:'Não',robo:'Não',comp:'2 meses antes',  lembrar:'2 dias antes' },
  { id:35, nome:'EFD ICMS IPI',                         depto:'Fiscal',    emp:1,   dias:D('20'),                                               multa:'Sim',robo:'Não',comp:'Mês anterior',   lembrar:'2 dias antes' },
  { id:36, nome:'EFD ICMSIPI',                         depto:'Fiscal',    emp:5,   dias:D('20'),                                               multa:'Sim',robo:'Sim',comp:'Mês anterior',   lembrar:'5 dias antes' },
  { id:37, nome:'EFD REINF',                            depto:'Fiscal',    emp:133, dias:D('15'),                                               multa:'Não',robo:'Não',comp:'Mês anterior',   lembrar:'2 dias antes' },
  { id:38, nome:'Empreiteiros',                         depto:'Contábil 2',emp:0,   dias:D('10°DU'),                                            multa:'Não',robo:'Não',comp:'Mês anterior',   lembrar:'5 dias antes' },
  { id:39, nome:'Extrato - 13° Adiantamento',           depto:'Pessoal',   emp:38,  dias:['—','—','—','—','—','—','—','—','—','—','30','—'],    multa:'Não',robo:'Não',comp:'Mesmo mês',      lembrar:'15 dias antes'},
  { id:40, nome:'Extrato - 13° Salário',                depto:'Pessoal',   emp:37,  dias:['—','—','—','—','—','—','—','—','—','—','—','20'],    multa:'Não',robo:'Não',comp:'Mesmo mês',      lembrar:'20 dias antes'},
  { id:41, nome:'Extrato Conta FGTS',                   depto:'Pessoal',   emp:12,  dias:D('30'),                                               multa:'Não',robo:'Não',comp:'Mesmo mês',      lembrar:'4 dias antes' },
  { id:42, nome:'Extrato Mensal - Folha de Pagamento',  depto:'Pessoal',   emp:48,  dias:D('7'),                                                multa:'Não',robo:'Não',comp:'Mês anterior',   lembrar:'4 dias antes' },
  { id:43, nome:'Extrato PGDAS',                        depto:'Fiscal',    emp:63,  dias:D('20'),                                               multa:'Sim',robo:'Sim',comp:'Mês anterior',   lembrar:'5 dias antes' },
  { id:44, nome:'Extratos Bancários',                   depto:'Contábil 2',emp:73,  dias:D('10°DU'),                                            multa:'Sim',robo:'Não',comp:'Mês anterior',   lembrar:'5 dias antes' },
  { id:45, nome:'Férias',                               depto:'Pessoal',   emp:22,  dias:['7','31','31','1°DU','1°DU','1°DU','1°DU','1°DU','1°DU','1°DU','1°DU','1°DU'], multa:'Não',robo:'Não',comp:'Mesmo mês',lembrar:'2 dias antes'},
  { id:46, nome:'FGTS',                                 depto:'Pessoal',   emp:40,  dias:['7','7','20','20','20','20','20','20','20','20','20','20'], multa:'Sim',robo:'Sim',comp:'Mês anterior',lembrar:'5 dias antes'},
  { id:47, nome:'FUNRURAL',                             depto:'Fiscal',    emp:0,   dias:D('20'),                                               multa:'Não',robo:'Não',comp:'Mês anterior',   lembrar:'5 dias antes' },
  { id:48, nome:'GIA',                                  depto:'Fiscal',    emp:0,   dias:['—','—','—','—','16','—','—','—','—','—','—','—'],    multa:'Não',robo:'Não',comp:'Mês anterior',   lembrar:'5 dias antes' },
  { id:49, nome:'GRRF - Guia Recolhimento Rescisório',  depto:'Pessoal',   emp:20,  dias:['7','7','7','7','7','7','18°DU','1°DU','1°DU','1°DU','7','7'], multa:'Sim',robo:'Não',comp:'Mesmo mês',lembrar:'4 dias antes'},
  { id:50, nome:'ICMS',                                 depto:'Fiscal',    emp:1,   dias:D('10'),                                               multa:'Não',robo:'Não',comp:'Mês anterior',   lembrar:'5 dias antes' },
  { id:51, nome:'ICMS Diferencial de Alíquota - DIFAL', depto:'Fiscal',    emp:0,   dias:D('ÚltDU'),                                            multa:'Não',robo:'Não',comp:'2 meses antes',  lembrar:'5 dias antes' },
  { id:52, nome:'ICMS ST',                              depto:'Fiscal',    emp:0,   dias:D('9'),                                                multa:'Não',robo:'Não',comp:'Mês anterior',   lembrar:'5 dias antes' },
  { id:53, nome:'Informe de Rendimento',                depto:'Pessoal',   emp:111, dias:['—','28','—','—','—','—','—','—','—','—','—','—'],    multa:'Sim',robo:'Não',comp:'Ano anterior',   lembrar:'5 dias antes' },
  { id:54, nome:'INSS - IRRF',                          depto:'Pessoal',   emp:64,  dias:D('20'),                                               multa:'Sim',robo:'Sim',comp:'Mês anterior',   lembrar:'5 dias antes' },
  { id:55, nome:'INSS - Serviços Prestados',            depto:'Fiscal',    emp:3,   dias:D('20'),                                               multa:'Não',robo:'Não',comp:'Mês anterior',   lembrar:'10 dias antes'},
  { id:56, nome:'INSS - Serviços Tomados',              depto:'Fiscal',    emp:26,  dias:D('20'),                                               multa:'Não',robo:'Não',comp:'Mês anterior',   lembrar:'10 dias antes'},
  { id:57, nome:'INSS 13° Salário',                     depto:'Pessoal',   emp:29,  dias:['—','—','—','—','—','—','—','—','—','—','—','20'],    multa:'Não',robo:'Não',comp:'Mesmo mês',      lembrar:'5 dias antes' },
  { id:58, nome:'IRRF - Salário',                       depto:'Pessoal',   emp:19,  dias:D('20'),                                               multa:'Não',robo:'Não',comp:'Mês anterior',   lembrar:'5 dias antes' },
  { id:59, nome:'IRRF - Serviços Tomados',              depto:'Fiscal',    emp:12,  dias:D('20'),                                               multa:'Não',robo:'Não',comp:'Mês anterior',   lembrar:'10 dias antes'},
  { id:60, nome:'ISS - Retido da Fonte',                depto:'Fiscal',    emp:61,  dias:D('10'),                                               multa:'Sim',robo:'Não',comp:'Mês anterior',   lembrar:'5 dias antes' },
  { id:61, nome:'Marketing',                            depto:'Contábil 2',emp:2,   dias:['—','—','—','—','—','—','15°DU','—','—','—','—','—'], multa:'Não',robo:'Não',comp:'Mês anterior',   lembrar:'5 dias antes' },
  { id:62, nome:'Memória de Cálculo Simples Nacional',  depto:'Fiscal',    emp:42,  dias:D('20'),                                               multa:'Sim',robo:'Não',comp:'Mês anterior',   lembrar:'5 dias antes' },
  { id:63, nome:'Parcelamento - ICMS Auto de Infração', depto:'Fiscal',    emp:0,   dias:D('25'),                                               multa:'Não',robo:'Sim',comp:'Mesmo mês',      lembrar:'10 dias antes'},
  { id:64, nome:'Parcelamento ICMS',                    depto:'Fiscal',    emp:0,   dias:D('25'),                                               multa:'Sim',robo:'Sim',comp:'Mesmo mês',      lembrar:'10 dias antes'},
  { id:65, nome:'Parcelamento INSS DAU',                depto:'Fiscal',    emp:0,   dias:D('ÚltDU'),                                            multa:'Não',robo:'Não',comp:'Mesmo mês',      lembrar:'15 dias antes'},
  { id:66, nome:'Parcelamento INSS Intimação',          depto:'Fiscal',    emp:0,   dias:D('ÚltDU'),                                            multa:'Não',robo:'Não',comp:'Mesmo mês',      lembrar:'15 dias antes'},
  { id:67, nome:'Parcelamento Receita Federal',         depto:'Bancos',    emp:107, dias:['—','—','15','15','15','15','15','15','15','15','15','15'], multa:'Sim',robo:'Não',comp:'Mês anterior',lembrar:'5 dias antes'},
  { id:68, nome:'Parcelamento Simples Nacional',        depto:'Bancos',    emp:3,   dias:['5°DU','5°DU','5°DU','5°DU','5°DU','5°DU','5°DU','5°DU','—','—','—','—'], multa:'Não',robo:'Sim',comp:'Mês seguinte',lembrar:'5 dias antes'},
  { id:69, nome:'Pró-labore',                           depto:'Pessoal',   emp:0,   dias:D('5°DU'),                                             multa:'Não',robo:'Não',comp:'Mês anterior',   lembrar:'4 dias antes' },
  { id:70, nome:'Recibo de Pagamento',                  depto:'Pessoal',   emp:62,  dias:D('5°DU'),                                             multa:'Não',robo:'Não',comp:'Mês anterior',   lembrar:'3 dias antes' },
  { id:71, nome:'Recibo de Pagamento - 13° Adiantamento',depto:'Pessoal',  emp:37,  dias:['—','—','—','—','—','—','—','—','—','—','ÚltDU','—'],multa:'Não',robo:'Não',comp:'Mesmo mês',      lembrar:'15 dias antes'},
  { id:72, nome:'Recibo de Pagamento - 13° Salário',    depto:'Pessoal',   emp:36,  dias:['—','—','—','—','—','—','—','—','—','—','—','20'],    multa:'Não',robo:'Não',comp:'Mesmo mês',      lembrar:'20 dias antes'},
  { id:73, nome:'Recibo PGDAS',                         depto:'Fiscal',    emp:65,  dias:D('20'),                                               multa:'Sim',robo:'Sim',comp:'Mês anterior',   lembrar:'5 dias antes' },
  { id:74, nome:'Rel. Geral dos Líquidos - 13° Adiantamento',depto:'Pessoal',emp:28,dias:['—','—','—','—','—','—','—','—','—','—','30','20'], multa:'Sim',robo:'Não',comp:'Mesmo mês',      lembrar:'20 dias antes'},
  { id:75, nome:'Rel. Geral dos Líquidos - 13° Integral',depto:'Pessoal',  emp:21,  dias:['—','—','—','—','—','—','—','—','—','—','—','20'],   multa:'Sim',robo:'Não',comp:'Mesmo mês',      lembrar:'20 dias antes'},
  { id:76, nome:'Relatório Férias',                     depto:'Pessoal',   emp:34,  dias:['2','ÚltDU','ÚltDU','ÚltDU','ÚltDU','ÚltDU','ÚltDU','ÚltDU','ÚltDU','ÚltDU','ÚltDU','ÚltDU'], multa:'Sim',robo:'Não',comp:'Mesmo mês',lembrar:'4 dias antes'},
  { id:77, nome:'Relatório FGTS',                       depto:'Pessoal',   emp:32,  dias:['7','7','20','20','20','20','20','20','20','20','20','20'], multa:'Não',robo:'Não',comp:'Mês anterior',lembrar:'5 dias antes'},
  { id:78, nome:'Relatório Líquido Folha',              depto:'Pessoal',   emp:44,  dias:['7','5°DU','5°DU','5°DU','5°DU','5°DU','5°DU','5°DU','5°DU','5°DU','5°DU','5°DU'], multa:'Não',robo:'Não',comp:'Mês anterior',lembrar:'3 dias antes'},
  { id:79, nome:'Req. Seguro Desemprego',               depto:'Pessoal',   emp:17,  dias:['7','7','7','7','7','7','30','30','30','30','30','30'], multa:'Não',robo:'Não',comp:'Mês anterior',  lembrar:'5 dias antes' },
  { id:80, nome:'REST - Rel. de Serviços de Terceiros', depto:'Fiscal',    emp:109, dias:D('10'),                                               multa:'Sim',robo:'Não',comp:'Mês anterior',   lembrar:'5 dias antes' },
  { id:81, nome:'SPED ECD - Escrituração Contábil Digital',depto:'Contábil',emp:70, dias:['—','—','—','—','ÚltDU','—','—','—','—','—','—','—'],multa:'Não',robo:'Não',comp:'Ano anterior',   lembrar:'5 dias antes' },
  { id:82, nome:'SPED ECF - Escrituração Contábil Fiscal',depto:'Contábil', emp:70, dias:['—','—','—','—','—','—','—','ÚltDU','—','—','—','—'],multa:'Não',robo:'Não',comp:'Ano anterior',   lembrar:'5 dias antes' },
  { id:83, nome:'SPED Livros Fiscais de Saídas',        depto:'Contábil',  emp:7,   dias:D('20'),                                               multa:'Sim',robo:'Sim',comp:'Mês anterior',   lembrar:'5 dias antes' },
  { id:84, nome:'Taxa de Licença para Funcionamento',   depto:'Fiscal',    emp:78,  dias:['20','—','—','—','—','—','—','—','—','—','—','—'],    multa:'Sim',robo:'Não',comp:'Ano anterior',   lembrar:'10 dias antes'},
  { id:85, nome:'Termo de Rescisão de Contrato',        depto:'Pessoal',   emp:23,  dias:D('—'),                                                multa:'Sim',robo:'Não',comp:'Mesmo mês',      lembrar:'4 dias antes' },
]

const POR_PAG = 10

export default function Obrigacoes() {
  const [view, setView]     = useState('lista')
  const [lista, setLista]   = useState(OBRIGACOES)
  const [busca, setBusca]   = useState('')
  const [pag, setPag]       = useState(1)
  const [form, setForm]     = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [filtroDepto, setFiltroDepto] = useState('')

  const filtrados = lista.filter(t =>
    t.nome.toLowerCase().includes(busca.toLowerCase()) &&
    (filtroDepto === '' || t.depto === filtroDepto)
  )
  const totalPags = Math.max(1, Math.ceil(filtrados.length / POR_PAG))
  const pagAtual  = filtrados.slice((pag-1)*POR_PAG, pag*POR_PAG)

  const abrirNovo = () => { setForm(emptyForm); setEditId(null); setView('form') }
  const abrirEdit = (t) => {
    setForm({ ...emptyForm, nome:t.nome, departamento:DEPTOS.find(d=>d.includes(t.depto))||DEPTOS[2],
      lembrar:t.lembrar, competencia_ref:t.comp, passivel_multa:t.multa, exigir_robo:t.robo })
    setEditId(t.id); setView('form')
  }
  const excluir = (id) => { if(confirm('Excluir esta obrigação?')) setLista(l=>l.filter(t=>t.id!==id)) }
  const salvar = () => {
    if (!form.nome.trim()) return alert('Informe o nome da obrigação.')
    if (editId) {
      setLista(l => l.map(t => t.id===editId ? {...t, nome:form.nome, depto:form.departamento.split(' - ')[0], multa:form.passivel_multa, robo:form.exigir_robo, comp:form.competencia_ref, lembrar:form.lembrar} : t))
    } else {
      setLista(l => [...l, { id:Date.now(), nome:form.nome, depto:form.departamento.split(' - ')[0], emp:0,
        dias:form.entregas.map(e=>e.replace('Todo dia ','')), multa:form.passivel_multa, robo:form.exigir_robo, comp:form.competencia_ref, lembrar:form.lembrar }])
    }
    setView('lista')
  }
  const setEntrega = (i,v) => setForm(f => { const e=[...f.entregas]; e[i]=v; return {...f,entregas:e} })
  const sel = (label, field, opts) => (
    <div style={{display:'flex',flexDirection:'column',gap:3}}>
      <label style={{fontSize:11,fontWeight:600,color:'#555'}}>{label}</label>
      <select value={form[field]} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))}
        style={{padding:'6px 8px',border:'1px solid #ccc',borderRadius:5,fontSize:13,background:'#fff'}}>
        {opts.map(o=><option key={o}>{o}</option>)}
      </select>
    </div>
  )

  const deptos = [...new Set(lista.map(t=>t.depto))].sort()

  // ── LISTA ────────────────────────────────────────────────────────────────
  if (view==='lista') return (
    <div style={{background:'#fff',borderRadius:12,boxShadow:'0 1px 6px rgba(0,0,0,.09)',overflow:'hidden'}}>
      {/* Toolbar */}
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',borderBottom:'1px solid #e5e7eb',background:'#fafafa',flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',border:'1px solid #ccc',borderRadius:6,background:'#fff',overflow:'hidden',flex:'1 1 180px',maxWidth:280}}>
          <Search size={14} color="#aaa" style={{marginLeft:10,flexShrink:0}}/>
          <input value={busca} onChange={e=>{setBusca(e.target.value);setPag(1)}} placeholder="Filtrar obrigação"
            style={{flex:1,border:'none',outline:'none',fontSize:13,padding:'7px 8px'}} />
        </div>
        <select value={filtroDepto} onChange={e=>{setFiltroDepto(e.target.value);setPag(1)}}
          style={{padding:'7px 10px',border:'1px solid #ccc',borderRadius:6,fontSize:13,background:'#fff'}}>
          <option value="">Todos os deptos</option>
          {deptos.map(d=><option key={d}>{d}</option>)}
        </select>
        <span style={{color:'#2563eb',fontWeight:700,fontSize:13,margin:'0 auto'}}>
          {filtrados.length} reg - pág {pag}/{totalPags}
        </span>
        <button title="Imprimir" style={{background:'none',border:'none',cursor:'pointer',padding:4}}><Printer size={17} color="#888"/></button>
        <button onClick={abrirNovo} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 16px',background:'#16a34a',color:'#fff',border:'none',borderRadius:6,cursor:'pointer',fontSize:13,fontWeight:500}}>
          <Plus size={14}/> Nova obrigação
        </button>
      </div>

      {/* Tabela */}
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
          <thead>
            <tr style={{background:'#f1f5f9',borderBottom:'2px solid #e2e8f0'}}>
              <th style={{padding:'9px 14px',textAlign:'left',color:'#475569',fontWeight:600,fontSize:12,minWidth:220}}>Obrigação ↕ / Departamento / Qtde empresas</th>
              <th style={{padding:'9px 10px',textAlign:'left',color:'#475569',fontWeight:600,fontSize:11,minWidth:340}}>Datas para entrega (DU = Dia Útil)</th>
              <th style={{padding:'9px 10px',textAlign:'center',color:'#475569',fontWeight:600,fontSize:11,whiteSpace:'nowrap'}}>Multa?<br/>Robô?</th>
              <th style={{padding:'9px 10px',textAlign:'center',color:'#475569',fontWeight:600,fontSize:11,whiteSpace:'nowrap'}}>Compet.<br/>Lembrar</th>
            </tr>
          </thead>
          <tbody>
            {pagAtual.map((t,i) => {
              const diasValidos = t.dias.filter(d=>d!=='—')
              const linha1 = diasValidos.slice(0,6).join('  ')
              const linha2 = diasValidos.slice(6).join('  ')
              return (
                <tr key={t.id} onClick={()=>abrirEdit(t)}
                  style={{borderBottom:'1px solid #f1f5f9',cursor:'pointer',background:i%2===0?'#fff':'#fafafa'}}
                  onMouseEnter={e=>e.currentTarget.style.background='#eff6ff'}
                  onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'#fff':'#fafafa'}>
                  <td style={{padding:'8px 14px'}}>
                    <div style={{color:'#2563eb',fontWeight:500}}>{t.nome}</div>
                    <div style={{color:'#94a3b8',fontSize:11,marginTop:1}}>Depto {t.depto}&nbsp;&nbsp;<span style={{color:t.emp>0?'#64748b':'#cbd5e1'}}>{t.emp} empresa{t.emp!==1?'s':''}</span></div>
                  </td>
                  <td style={{padding:'8px 10px',color:'#334155',fontSize:11}}>
                    {t.robo==='Sim' && <span style={{color:'#3b82f6',marginRight:6}}>♦</span>}
                    <span>{linha1}</span>
                    {linha2 && <><br/><span style={{paddingLeft:14}}>{linha2}</span></>}
                  </td>
                  <td style={{padding:'8px 10px',textAlign:'center',fontSize:12}}>
                    <div style={{color:t.multa==='Sim'?'#dc2626':'#94a3b8'}}>{t.multa}</div>
                    <div style={{color:t.robo==='Sim'?'#2563eb':'#94a3b8'}}>{t.robo}</div>
                  </td>
                  <td style={{padding:'8px 10px',textAlign:'right',fontSize:12,paddingRight:16}}>
                    <div style={{color:'#475569'}}>{t.comp}</div>
                    <div style={{color:'#94a3b8',fontSize:11}}>{t.lembrar}</div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div style={{display:'flex',justifyContent:'center',gap:4,padding:'12px',borderTop:'1px solid #f1f5f9'}}>
        <button onClick={()=>setPag(1)} disabled={pag===1} style={{padding:'5px 10px',border:'1px solid #e2e8f0',borderRadius:5,background:'#fff',cursor:pag===1?'default':'pointer',color:pag===1?'#cbd5e1':'#334155'}}>«</button>
        <button onClick={()=>setPag(p=>Math.max(1,p-1))} disabled={pag===1} style={{padding:'5px 10px',border:'1px solid #e2e8f0',borderRadius:5,background:'#fff',cursor:pag===1?'default':'pointer',color:pag===1?'#cbd5e1':'#334155'}}><ChevronLeft size={13}/></button>
        {Array.from({length:totalPags},(_,i)=>i+1).filter(p=>Math.abs(p-pag)<4).map(p=>(
          <button key={p} onClick={()=>setPag(p)} style={{padding:'5px 11px',border:'1px solid',borderColor:p===pag?'#2563eb':'#e2e8f0',borderRadius:5,background:p===pag?'#2563eb':'#fff',color:p===pag?'#fff':'#334155',cursor:'pointer',fontWeight:p===pag?600:400}}>{p}</button>
        ))}
        <button onClick={()=>setPag(p=>Math.min(totalPags,p+1))} disabled={pag===totalPags} style={{padding:'5px 10px',border:'1px solid #e2e8f0',borderRadius:5,background:'#fff',cursor:pag===totalPags?'default':'pointer',color:pag===totalPags?'#cbd5e1':'#334155'}}><ChevronRight size={13}/></button>
        <button onClick={()=>setPag(totalPags)} disabled={pag===totalPags} style={{padding:'5px 10px',border:'1px solid #e2e8f0',borderRadius:5,background:'#fff',cursor:pag===totalPags?'default':'pointer',color:pag===totalPags?'#cbd5e1':'#334155'}}>»</button>
      </div>
    </div>
  )

  // ── FORMULÁRIO ───────────────────────────────────────────────────────────
  return (
    <div style={{background:'#fff',borderRadius:12,boxShadow:'0 1px 6px rgba(0,0,0,.09)'}}>
      <div style={{display:'flex',alignItems:'center',gap:6,padding:'10px 18px',borderBottom:'1px solid #e5e7eb',background:'#f8fafc',borderRadius:'12px 12px 0 0',fontSize:13}}>
        <span style={{color:'#64748b'}}>Obrigações</span>
        <span style={{color:'#cbd5e1'}}>›</span>
        <span style={{color:'#2563eb',fontWeight:500}}>Cadastro de obrigação</span>
      </div>
      <div style={{padding:'16px 18px 10px',display:'grid',gridTemplateColumns:'2fr 1fr 2fr 1fr',gap:14}}>
        <div style={{display:'flex',flexDirection:'column',gap:3}}>
          <label style={{fontSize:11,fontWeight:600,color:'#555'}}>Nome da obrigação</label>
          <input value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} style={{padding:'7px 10px',border:'1px solid #ccc',borderRadius:5,fontSize:13,fontWeight:500}} />
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:3}}>
          <label style={{fontSize:11,fontWeight:600,color:'#555'}}>Mininome</label>
          <input value={form.mininome} onChange={e=>setForm(f=>({...f,mininome:e.target.value}))} style={{padding:'7px 10px',border:'1px solid #ccc',borderRadius:5,fontSize:13}} />
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:3}}>
          <label style={{fontSize:11,fontWeight:600,color:'#555'}}>Departamento e Responsável</label>
          <select value={form.departamento} onChange={e=>setForm(f=>({...f,departamento:e.target.value}))} style={{padding:'7px 10px',border:'1px solid #ccc',borderRadius:5,fontSize:13,background:'#fff'}}>
            {DEPTOS.map(d=><option key={d}>{d}</option>)}
          </select>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:3}}>
          <label style={{fontSize:11,fontWeight:600,color:'#555'}}>Tempo previsto (min)</label>
          <input type="number" value={form.tempo_previsto} onChange={e=>setForm(f=>({...f,tempo_previsto:e.target.value}))} style={{padding:'7px 10px',border:'1px solid #ccc',borderRadius:5,fontSize:13}} />
        </div>
      </div>
      <div style={{padding:'4px 18px 14px'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:10}}>
          {MESES_FULL.map((mes,i)=>(
            <div key={mes} style={{display:'flex',flexDirection:'column',gap:3}}>
              <label style={{fontSize:11,fontWeight:600,color:'#555'}}>Entrega {mes} ↓</label>
              <select value={form.entregas[i]} onChange={e=>setEntrega(i,e.target.value)} style={{padding:'6px 4px',border:'1px solid #ccc',borderRadius:5,fontSize:11,background:'#fff'}}>
                {DIAS.map(d=><option key={d}>{d}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>
      <div style={{padding:'4px 18px 14px',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
        {sel('Lembrar quantos dias antes?','lembrar',LEMBRAR)}
        {sel('Tipo dos dias','tipo_dias',['Dias corridos','Dias úteis'])}
        {sel('Prazos fixos em dias não-úteis','prazos_fixos',PRAZOS)}
        {sel('Sábado é útil?','sabado_util',['Não','Sim'])}
        {sel('Competências referentes a','competencia_ref',COMPETENCIAS)}
        {sel('Exigir Robô?','exigir_robo',['Não','Sim'])}
        {sel('Passível de multa?','passivel_multa',['Não','Sim'])}
        {sel('Alerta guia ñ-lida?','alerta_guia',['Sim','Não'])}
        {sel('Ativa?','ativa',['Sim','Não'])}
      </div>
      <div style={{padding:'0 18px 14px',display:'flex',flexDirection:'column',gap:3}}>
        <label style={{fontSize:11,fontWeight:600,color:'#555'}}>Comentário Padrão</label>
        <textarea value={form.comentario} onChange={e=>setForm(f=>({...f,comentario:e.target.value}))} rows={3} placeholder="Comentário padrão" style={{padding:'8px 10px',border:'1px solid #ccc',borderRadius:5,fontSize:13,resize:'vertical',fontFamily:'inherit'}} />
      </div>
      <div style={{display:'flex',gap:10,padding:'12px 18px',borderTop:'1px solid #e5e7eb',background:'#f8fafc',borderRadius:'0 0 12px 12px',flexWrap:'wrap'}}>
        <button onClick={()=>setView('lista')} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 18px',background:'#64748b',color:'#fff',border:'none',borderRadius:6,cursor:'pointer',fontSize:13}}><RotateCcw size={13}/> Retro</button>
        <div style={{marginLeft:'auto',display:'flex',gap:10}}>
          <button onClick={salvar} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 20px',background:'#16a34a',color:'#fff',border:'none',borderRadius:6,cursor:'pointer',fontSize:13,fontWeight:600}}><Save size={13}/> Salvar</button>
          <button onClick={abrirNovo} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 18px',background:'#2563eb',color:'#fff',border:'none',borderRadius:6,cursor:'pointer',fontSize:13}}><Plus size={13}/> Nova</button>
          <button onClick={()=>setView('lista')} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 18px',background:'#f59e0b',color:'#fff',border:'none',borderRadius:6,cursor:'pointer',fontSize:13}}><X size={13}/> Voltar</button>
        </div>
      </div>
    </div>
  )
}
