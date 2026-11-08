// Dados FICTÍCIOS usados apenas no modo demonstração.
import type { Tables } from './types'
import { addDays, today } from './dates'

type DB = { [K in keyof Tables]: Tables[K][] }

function isbnFake(n: number): string {
  // ISBN-13 com dígito verificador válido (prefixo brasileiro 978-85), apenas para demonstração
  const base = `97885${String(1000000 + n * 7919).slice(-7)}`
  const sum = base.split('').reduce((s, d, i) => s + Number(d) * (i % 2 ? 3 : 1), 0)
  return base + ((10 - (sum % 10)) % 10)
}

export function buildSeed(): DB & { senhas: Record<string, string> } {
  const t = today()
  const now = new Date().toISOString()
  const ago = (d: number) => addDays(t, -d)

  const livrosBase: [string, string, string, number, string, number][] = [
    ['Dom Casmurro', 'Machado de Assis', 'Literatura brasileira', 1899, 'A1', 3],
    ['Memórias Póstumas de Brás Cubas', 'Machado de Assis', 'Literatura brasileira', 1881, 'A1', 2],
    ['Grande Sertão: Veredas', 'João Guimarães Rosa', 'Literatura brasileira', 1956, 'A2', 2],
    ['Vidas Secas', 'Graciliano Ramos', 'Literatura brasileira', 1938, 'A2', 3],
    ['Capitães da Areia', 'Jorge Amado', 'Literatura brasileira', 1937, 'A2', 2],
    ['A Hora da Estrela', 'Clarice Lispector', 'Literatura brasileira', 1977, 'A3', 2],
    ['Quarto de Despejo', 'Carolina Maria de Jesus', 'Biografia', 1960, 'B1', 2],
    ['O Menino Maluquinho', 'Ziraldo', 'Infantil', 1980, 'C1', 4],
    ['Reinações de Narizinho', 'Monteiro Lobato', 'Infantil', 1931, 'C1', 3],
    ['Marcelo, Marmelo, Martelo', 'Ruth Rocha', 'Infantil', 1976, 'C1', 3],
    ['A Bolsa Amarela', 'Lygia Bojunga', 'Infantojuvenil', 1976, 'C2', 2],
    ['O Pequeno Príncipe', 'Antoine de Saint-Exupéry', 'Literatura estrangeira', 1943, 'B2', 4],
    ['O Cortiço', 'Aluísio Azevedo', 'Literatura brasileira', 1890, 'A1', 2],
    ['Morte e Vida Severina', 'João Cabral de Melo Neto', 'Poesia', 1955, 'A3', 2],
  ]
  const manuais: [string, string, string, string][] = [
    ['Apostila de Informática Básica', 'Equipe da Biblioteca Digital', 'Informática', 'D1'],
    ['História de Sobrália', 'Acervo local', 'História', 'E1'],
    ['Atlas Geográfico Escolar', 'Doação da comunidade', 'Didático', 'D2'],
  ]

  const livros: Tables['livros'][] = [
    ...livrosBase.map(([titulo, autores, categoria, ano, localizacao, quantidade], i) => ({
      id: `l${i + 1}`, isbn: isbnFake(i + 1), codigo_interno: null, titulo, subtitulo: null, autores,
      editora: null, ano, paginas: null, categoria, idioma: 'Português', descricao: null, capa_url: null,
      localizacao: `Estante ${localizacao}`, quantidade, emprestados: 0, origem: 'isbn' as const,
      created_at: new Date(Date.now() - (livrosBase.length - i) * 86_400_000 * 3).toISOString(),
    })),
    ...manuais.map(([titulo, autores, categoria, loc], i) => ({
      id: `lm${i + 1}`, isbn: null, codigo_interno: `BD-${String(i + 1).padStart(5, '0')}`, titulo, subtitulo: null,
      autores, editora: null, ano: null, paginas: null, categoria, idioma: 'Português', descricao: null,
      capa_url: null, localizacao: `Estante ${loc}`, quantidade: 2, emprestados: 0, origem: 'manual' as const,
      created_at: now,
    })),
  ]

  const pessoas: [string, string | null, string, string | null][] = [
    ['Ana Clara Souza', ago(365 * 11), '33988110001', 'Rosângela Souza'],
    ['João Pedro Lima', ago(365 * 12 + 40), '33988110002', 'Marcos Lima'],
    ['Maria Eduarda Santos', ago(365 * 34), '33988110003', null],
    ['Lucas Oliveira', ago(365 * 10 + 100), '33988110004', 'Cláudia Oliveira'],
    ['Beatriz Rocha', ago(365 * 13), '33988110005', 'Paulo Rocha'],
    ['Gabriel Ferreira', ago(365 * 15), '33988110006', 'Simone Ferreira'],
    ['Sofia Almeida', ago(365 * 9 + 20), '33988110007', 'Juliana Almeida'],
    ['Terezinha Costa', ago(365 * 67), '33988110008', null],
    ['Antônio Pereira', ago(365 * 58), '33988110009', null],
    ['Davi Martins', ago(365 * 11 + 200), '33988110010', 'Luciana Martins'],
  ]
  const membros: Tables['membros'][] = pessoas.map(([nome, nasc, tel, resp], i) => ({
    id: `m${i + 1}`, carteirinha: String(i + 1).padStart(6, '0'), nome, data_nascimento: nasc,
    telefone: resp ? null : tel, telefone_whatsapp: i % 4 !== 3, email: i === 2 ? 'leitor@demo.com' : i === 8 ? 'antonio@exemplo.com' : null,
    endereco: 'Centro, Sobrália/MG', responsavel_nome: resp, responsavel_telefone: resp ? tel : null,
    observacoes: null, ativo: true, created_at: now,
  }))

  const e = (id: number, livro: string, membro: string, saiu: number, prazo: number, voltou: number | null): Tables['emprestimos'] => ({
    id: `e${id}`, livro_id: livro, membro_id: membro, data_emprestimo: ago(saiu),
    data_prevista: addDays(ago(saiu), prazo), data_devolucao: voltou === null ? null : ago(voltou),
    renovacoes: 0, observacoes: null, ultimo_aviso_em: null, whatsapp_avisado_em: null, created_at: now,
  })
  const emprestimos = [
    e(1, 'l8', 'm1', 5, 14, null), e(2, 'l12', 'm3', 10, 14, null), e(3, 'l1', 'm9', 20, 14, null),
    e(4, 'l9', 'm4', 18, 14, null), e(5, 'l4', 'm8', 13, 14, null), e(6, 'l10', 'm7', 2, 14, null),
    e(7, 'l2', 'm8', 60, 14, 50), e(8, 'l8', 'm2', 40, 14, 30), e(9, 'l12', 'm5', 75, 14, 66),
    e(10, 'l3', 'm9', 100, 14, 85), e(11, 'l11', 'm5', 120, 14, 110), e(12, 'l8', 'm10', 140, 14, 128),
    e(13, 'l5', 'm6', 30, 14, 20), e(14, 'l9', 'm1', 95, 14, 80), e(15, 'lm1', 'm6', 45, 14, 35),
    e(16, 'l7', 'm3', 150, 14, 140), e(17, 'l12', 'm4', 160, 14, 150), e(18, 'l6', 'm8', 25, 14, 12),
  ]

  const cursos: Tables['cursos'][] = [
    { id: 'c1', nome: 'Informática Básica', descricao: 'Primeiros passos no computador: mouse, teclado, arquivos, internet e e-mail com segurança.', carga_horaria: 40, publico: 'Crianças a partir de 8 anos', cor: '#0339A6', created_at: now },
    { id: 'c2', nome: 'Digitação e Escritório', descricao: 'Digitação com os 10 dedos, editor de textos, planilhas e apresentações.', carga_horaria: 30, publico: 'A partir de 10 anos', cor: '#034C8C', created_at: now },
    { id: 'c3', nome: 'Programação com Scratch', descricao: 'Lógica de programação criando jogos e animações de forma divertida.', carga_horaria: 24, publico: 'De 9 a 14 anos', cor: '#7CBF17', created_at: now },
  ]
  const turmas: Tables['turmas'][] = [
    { id: 't1', curso_id: 'c1', nome: 'Turma A — Manhã', professor: 'Prof. Rafael Nunes', dias_semana: [1, 3], hora_inicio: '08:00', hora_fim: '09:30', sala: 'Laboratório', vagas: 10, matriculados: 0, data_inicio: ago(30), data_fim: addDays(t, 60), status: 'andamento', created_at: now },
    { id: 't2', curso_id: 'c1', nome: 'Turma B — Tarde', professor: 'Prof. Rafael Nunes', dias_semana: [2, 4], hora_inicio: '14:00', hora_fim: '15:30', sala: 'Laboratório', vagas: 10, matriculados: 0, data_inicio: ago(30), data_fim: addDays(t, 60), status: 'andamento', created_at: now },
    { id: 't3', curso_id: 'c2', nome: 'Turma Única', professor: 'Profa. Camila Duarte', dias_semana: [5], hora_inicio: '09:00', hora_fim: '11:00', sala: 'Laboratório', vagas: 8, matriculados: 0, data_inicio: ago(15), data_fim: addDays(t, 75), status: 'andamento', created_at: now },
    { id: 't4', curso_id: 'c3', nome: 'Turma de Sábado', professor: 'Profa. Camila Duarte', dias_semana: [6], hora_inicio: '09:00', hora_fim: '11:00', sala: 'Laboratório', vagas: 12, matriculados: 0, data_inicio: addDays(t, 14), data_fim: addDays(t, 100), status: 'inscricoes', created_at: now },
  ]
  const mat = (i: number, turma: string, membro: string): Tables['matriculas'] =>
    ({ id: `mt${i}`, turma_id: turma, membro_id: membro, status: 'ativa', created_at: now })
  const matriculas = [
    mat(1, 't1', 'm1'), mat(2, 't1', 'm4'), mat(3, 't1', 'm7'), mat(4, 't1', 'm10'),
    mat(5, 't2', 'm2'), mat(6, 't2', 'm5'), mat(7, 't2', 'm6'),
    mat(8, 't3', 'm3'), mat(9, 't3', 'm6'), mat(10, 't3', 'm8'), mat(11, 't4', 'm1'),
  ]
  const frequencias: Tables['frequencias'][] = []
  let f = 1
  for (const d of [ago(7), ago(5), ago(2)]) {
    for (const m of ['m1', 'm4', 'm7', 'm10']) {
      frequencias.push({ id: `f${f++}`, turma_id: 't1', membro_id: m, data: d, presente: !(m === 'm7' && d === ago(5)), created_at: now })
    }
  }

  const computadores: Tables['computadores'][] = Array.from({ length: 8 }, (_, i) => ({
    id: `pc${i + 1}`, nome: `PC ${String(i + 1).padStart(2, '0')}`, descricao: i < 6 ? 'Uso livre — pesquisa e internet' : 'Laboratório do curso',
    status: i === 7 ? 'manutencao' as const : i === 0 || i === 2 ? 'em_uso' as const : 'livre' as const, created_at: now,
  }))
  const minAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString()
  const usos_computador: Tables['usos_computador'][] = [
    { id: 'u1', computador_id: 'pc1', membro_id: 'm9', visitante: null, finalidade: 'Currículo / emprego', inicio: minAgo(25), fim: null, created_at: now },
    { id: 'u2', computador_id: 'pc3', membro_id: null, visitante: 'Visitante — Carla', finalidade: 'Pesquisa escolar', inicio: minAgo(72), fim: null, created_at: now },
    { id: 'u3', computador_id: 'pc2', membro_id: 'm3', visitante: null, finalidade: 'Serviços públicos (gov.br)', inicio: minAgo(180), fim: minAgo(140), created_at: now },
  ]

  const insc = (id: string, turma: string, membro: string, menor: boolean, resp: [string, string, string] | null, horas: number): Tables['inscricoes'] => ({
    id, turma_id: turma, membro_id: membro, status: 'pendente', menor,
    responsavel_nome: resp?.[0] ?? null, responsavel_parentesco: resp?.[1] ?? null, responsavel_telefone: resp?.[2] ?? null, responsavel_email: null,
    termo_versao: menor ? 'v1' : null, termo_aceito_em: menor ? minAgo(horas * 60) : null, assinatura: menor ? assinaturaDemo(resp![0]) : null,
    observacoes: id === 'i1' ? 'Gosta muito de jogos' : null, motivo_recusa: null, avaliado_por: null, avaliado_em: null, created_at: minAgo(horas * 60),
  })
  const inscricoes = [
    insc('i1', 't4', 'm4', true, ['Cláudia Oliveira', 'Mãe', '33988110004'], 10),
    insc('i2', 't4', 'm6', true, ['Simone Ferreira', 'Mãe', '33988110006'], 26),
    insc('i3', 't1', 'm8', false, null, 30),
  ]

  const mensagens: Tables['mensagens'][] = [
    { id: 'msg1', membro_id: 'm3', remetente_id: 'u-admin', remetente_nome: 'Administração', assunto: 'Bem-vinda à Biblioteca Digital!',
      corpo: 'Sua carteirinha já está ativa. Você pode pegar até 3 livros por 14 dias e usar os computadores gratuitamente. Boas leituras!',
      tipo: 'mensagem', por_email: true, lida_em: null, created_at: minAgo(60 * 30) },
    { id: 'msg2', membro_id: 'm3', remetente_id: 'u-prof', remetente_nome: 'Prof. Rafael Nunes', assunto: 'Aula de sexta confirmada',
      corpo: 'Lembrete: na próxima aula vamos praticar planilhas. Traga um pendrive se tiver.', tipo: 'mensagem', por_email: false, lida_em: minAgo(60), created_at: minAgo(60 * 50) },
  ]

  const avaliacoes: Tables['avaliacoes'][] = [
    { id: 'av1', turma_id: 't1', membro_id: 'm1', data: ago(5), desempenho: 4, comportamento: 4, observacao: 'Aprende rápido e ajuda os colegas.', autor_id: 'u-prof', autor_nome: 'Prof. Rafael Nunes', created_at: now },
    { id: 'av2', turma_id: 't1', membro_id: 'm7', data: ago(5), desempenho: 2, comportamento: 3, observacao: 'Faltou uma aula; precisa praticar o uso do mouse.', autor_id: 'u-prof', autor_nome: 'Prof. Rafael Nunes', created_at: now },
  ]

  const configuracoes: Tables['configuracoes'][] = [{
    id: 1, nome_biblioteca: 'Biblioteca Digital de Sobrália', endereco: 'Centro — Sobrália/MG',
    telefone: '(33) 0000-0000', email: 'biblioteca@sobralia.mg.gov.br',
    horario: 'Segunda a sexta, das 8h às 17h',
    sobre: 'Um espaço público e gratuito com livros, computadores com internet e cursos de informática para crianças, jovens e toda a comunidade de Sobrália.',
    prazo_dias: 14, max_emprestimos: 3, max_renovacoes: 2, tempo_computador: 60,
  }]

  const profiles: Tables['profiles'][] = [
    { id: 'u-admin', email: 'admin@demo.com', nome: 'Administração', data_nascimento: null, role: 'admin', membro_id: null, created_at: now },
    { id: 'u-prof', email: 'professor@demo.com', nome: 'Prof. Rafael Nunes', data_nascimento: null, role: 'professor', membro_id: null, created_at: now },
    { id: 'u-leitor', email: 'leitor@demo.com', nome: 'Maria Eduarda Santos', data_nascimento: ago(365 * 34), role: 'leitor', membro_id: 'm3', created_at: now },
  ]

  return {
    livros, membros, emprestimos, cursos, turmas, matriculas, frequencias, avaliacoes, inscricoes, mensagens,
    fila_emails: [] as Tables['fila_emails'][], computadores, usos_computador, configuracoes, profiles,
    senhas: Object.fromEntries(profiles.map(p => [p.email, 'demo123'])),
  }
}

/** Assinatura desenhada de exemplo (só para a demonstração). */
function assinaturaDemo(nome: string): string | null {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = 480; c.height = 160
  const x = c.getContext('2d')!
  x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height)
  x.strokeStyle = '#06204a'; x.lineWidth = 3; x.lineCap = 'round'
  x.beginPath()
  let px = 40, py = 100
  x.moveTo(px, py)
  for (let i = 0; i < nome.length * 3; i++) {
    px += 9 + (i % 3)
    py = 100 + Math.sin(i * 1.7) * 28 - (i % 5 === 0 ? 20 : 0)
    x.quadraticCurveTo(px - 6, py - 30, px, py)
  }
  x.stroke()
  return c.toDataURL('image/png')
}
