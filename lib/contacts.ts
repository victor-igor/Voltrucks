import { supabase } from './supabase';

export interface Contact {
    id: string;
    nome_completo: string;
    telefone: string;
    email?: string;
    empresa?: string;
    cargo?: string;
    cpf?: string;
    cep?: string;
    endereco?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    receber_campanhas?: boolean;
    status: string;
    lead_score?: number;
    funil_status?: string;
    tags?: string[];
    origem?: string;
    observacoes?: string;
    resumo_lead?: string;
    ultima_interacao_lead?: string;
    created_at: string;
}

export async function listContacts() {
    let allContacts: Contact[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from('contatos')
            .select('*')
            .order('nome_completo')
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;

        if (data) {
            allContacts = [...allContacts, ...data];
            if (data.length < pageSize) {
                hasMore = false;
            }
        } else {
            hasMore = false;
        }
        page++;
    }

    return allContacts as Contact[];
}

export async function getContact(id: string) {
    const { data, error } = await supabase
        .from('contatos')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data as Contact;
}

export async function createContact(contact: Omit<Contact, 'id' | 'created_at'>) {
    const { data, error } = await supabase
        .from('contatos')
        .insert(contact)
        .select()
        .single();

    if (error) throw error;
    return data as Contact;
}

export async function updateContact(id: string, updates: Partial<Omit<Contact, 'id' | 'created_at'>>) {
    const { data, error } = await supabase
        .from('contatos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as Contact;
}

export async function deleteContact(id: string) {
    const { error } = await supabase
        .from('contatos')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
}

export interface Tag {
    id: string;
    name: string;
    color: string;
}

export async function getTags() {
    const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name');

    if (error) throw error;
    return data as Tag[];
}

export async function createTag(name: string, color: string = 'blue') {
    const { data, error } = await supabase
        .from('tags')
        .insert({ name, color })
        .select()
        .single();

    if (error) throw error;
    return data as Tag;
}

export async function deleteTag(id: string) {
    const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
}
