export const fetchConversationsWithStatus = async (supabase, userId, showArchived) => {
  let query = supabase
    .from('conversations')
    .select('id, title, estado, comentario, updated_at, user_id')
    .eq('user_id', userId);

  if (showArchived) {
    query = query.eq('estado', 'archivada');
  } else {
    query = query.or('estado.is.null,estado.neq.archivada');
  }

  const { data: conversationsData, error: convError } = await query.order('updated_at', { ascending: false });
  if (convError) {
    throw convError;
  }

  if (!conversationsData || conversationsData.length === 0) {
    return [];
  }

  const conversationIds = conversationsData.map((conv) => conv.id);
  const conversationTitles = [...new Set(conversationsData.map((conv) => conv.title?.trim()).filter(Boolean))];

  let clientRows = [];
  if (conversationTitles.length > 0) {
    const { data: clientsData, error: clientsError } = await supabase
      .from('clientes')
      .select('"NOMBRE COMPLETO", "FECHA ENVIO PLANTILLA"')
      .eq('user_id', userId)
      .in('NOMBRE COMPLETO', conversationTitles);

    if (clientsError) {
      throw clientsError;
    }

    clientRows = clientsData || [];
  }

  const { data: messagesData, error: messagesError } = await supabase
    .from('messages')
    .select('conversation_id, created_at, Respondido, sender_type')
    .in('conversation_id', conversationIds)
    .order('created_at', { ascending: false });

  if (messagesError) {
    throw messagesError;
  }

  const clientDateByName = new Map();
  clientRows.forEach((client) => {
    const normalizedName = client['NOMBRE COMPLETO']?.trim().toLowerCase();
    if (!normalizedName || clientDateByName.has(normalizedName)) {
      return;
    }

    clientDateByName.set(normalizedName, client['FECHA ENVIO PLANTILLA'] || null);
  });

  const lastMessageByConversation = new Map();
  const responseByConversation = new Map();
  (messagesData || []).forEach((message) => {
    if (!lastMessageByConversation.has(message.conversation_id)) {
      lastMessageByConversation.set(message.conversation_id, message.created_at);
    }

    if (
      !responseByConversation.has(message.conversation_id) &&
      (message.Respondido === true || message.sender_type === 'Asistente')
    ) {
      responseByConversation.set(message.conversation_id, message.created_at);
    }
  });

  const conversationsWithStatus = conversationsData.map((conv) => {
    const normalizedTitle = conv.title?.trim().toLowerCase();
    const fechaEnvioPlantilla = normalizedTitle ? clientDateByName.get(normalizedTitle) || null : null;
    const fechaUltimoMensaje = lastMessageByConversation.get(conv.id) || null;
    const hasResponse = responseByConversation.has(conv.id);

    let ultimaActualizacion = conv.updated_at;
    if (fechaEnvioPlantilla && fechaUltimoMensaje) {
      const fechaPlantillaTime = new Date(fechaEnvioPlantilla).getTime();
      const fechaMensajeTime = new Date(fechaUltimoMensaje).getTime();
      ultimaActualizacion = fechaMensajeTime > fechaPlantillaTime ? fechaUltimoMensaje : fechaEnvioPlantilla;
    } else if (fechaEnvioPlantilla) {
      ultimaActualizacion = fechaEnvioPlantilla;
    } else if (fechaUltimoMensaje) {
      ultimaActualizacion = fechaUltimoMensaje;
    }

    return {
      ...conv,
      hasResponse,
      lastMessageTime: responseByConversation.get(conv.id) || conv.updated_at,
      fechaEnvioPlantilla,
      ultimaActualizacion,
    };
  });

  conversationsWithStatus.sort((a, b) => {
    try {
      const dateA = a.ultimaActualizacion ? new Date(a.ultimaActualizacion) : new Date(0);
      const dateB = b.ultimaActualizacion ? new Date(b.ultimaActualizacion) : new Date(0);
      const timeA = !isNaN(dateA.getTime()) ? dateA.getTime() : 0;
      const timeB = !isNaN(dateB.getTime()) ? dateB.getTime() : 0;
      return timeB - timeA;
    } catch (e) {
      return 0;
    }
  });

  return conversationsWithStatus;
};

export const fetchClientsPage = async (supabase, userId, page, search, pageSize) => {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('clientes')
    .select('"N ORDEN", "Nº ORDEN", "NOMBRE COMPLETO", CONTRATO, SERVICIO, TELEFONO, "TELEFONO FIJO", MUNICIPIO, ESTADO, "ESTADO MENSAJE", FECHA', { count: 'estimated' })
    .eq('user_id', userId);

  if (search.trim() !== '') {
    query = query.ilike('"NOMBRE COMPLETO"', `%${search}%`);
  }

  const { data, error, count } = await query.order('"FECHA"', { ascending: false }).range(from, to);
  if (error) {
    throw error;
  }

  return {
    data: data || [],
    count: count || 0,
    hasMore: (data || []).length === pageSize,
  };
};

export const fetchMessagesByConversation = async (supabase, conversationId) => {
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_type, content, created_at, Respondido')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
};

export const fetchClientDetailsByPhone = async (supabase, userId, phoneNumber) => {
  const { data, error } = await supabase
    .from('clientes')
    .select('"N ORDEN", "NOMBRE COMPLETO", CONTRATO, SERVICIO, TELEFONO, "TELEFONO FIJO", DIRECCION, "CODIGO POSTAL", MUNICIPIO, ESTADO, "ESTADO MENSAJE", FECHA, "FECHA ENVIO PLANTILLA"')
    .eq('user_id', userId)
    .eq('TELEFONO', phoneNumber)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return data || null;
};

export const fetchExistingClientsSnapshot = async (supabase, userId) => {
  const { data, error } = await supabase
    .from('clientes')
    .select('"N ORDEN", "TELEFONO", "NOMBRE COMPLETO"')
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  return data || [];
};