// 방명록 Netlify Function
// GET  -> 최근 20개 조회
// POST -> 새 메시지 작성 (서버에서 모든 입력 검증)
//
// service_role 키는 서버(이 함수)에서만 사용하며 브라우저로 노출되지 않는다.
// 환경 변수: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const { createClient } = require('@supabase/supabase-js');

const MAX_MESSAGE = 200;
const MAX_NAME = 20;
const LIMIT = 20;

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function response(statusCode, bodyObj) {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify(bodyObj),
  };
}

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase 환경 변수가 설정되지 않았습니다.');
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

exports.handler = async function (event) {
  let supabase;
  try {
    supabase = getClient();
  } catch (e) {
    return response(500, { error: '서버 설정 오류입니다.' });
  }

  // 조회
  if (event.httpMethod === 'GET') {
    const { data, error } = await supabase
      .from('guestbook')
      .select('id, name, message, created_at')
      .order('created_at', { ascending: false })
      .limit(LIMIT);

    if (error) {
      return response(500, { error: '목록을 불러오지 못했습니다.' });
    }
    return response(200, { entries: data || [] });
  }

  // 작성
  if (event.httpMethod === 'POST') {
    let payload;
    try {
      payload = JSON.parse(event.body || '{}');
    } catch (e) {
      return response(400, { error: '잘못된 요청 형식입니다.' });
    }

    // 서버 측 검증 (브라우저 검증은 우회 가능하므로 여기서 재확인)
    let name = typeof payload.name === 'string' ? payload.name.trim() : '';
    let message = typeof payload.message === 'string' ? payload.message.trim() : '';

    if (message.length === 0) {
      return response(400, { error: '메시지를 입력해 주세요.' });
    }
    if (message.length > MAX_MESSAGE) {
      return response(400, { error: '메시지는 200자까지 입력할 수 있습니다.' });
    }
    if (name.length > MAX_NAME) {
      return response(400, { error: '이름은 20자까지 입력할 수 있습니다.' });
    }
    if (name.length === 0) {
      name = '익명';
    }

    const { data, error } = await supabase
      .from('guestbook')
      .insert([{ name, message }])
      .select('id, name, message, created_at')
      .single();

    if (error) {
      return response(500, { error: '저장하지 못했습니다.' });
    }
    return response(201, { entry: data });
  }

  return response(405, { error: '허용되지 않은 메서드입니다.' });
};
