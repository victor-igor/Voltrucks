import { supabase } from './supabase';

export type CampaignType = 'instant' | 'scheduled' | 'recurring';
export type CampaignStatus = 'draft' | 'pending' | 'active' | 'paused' | 'completed' | 'cancelled';

export interface RecurrenceRule {
    days: number[]; // 0-6 (Sunday-Saturday)
    times: string[]; // Array of HH:mm strings
}

export interface AudienceFilter {
    type: 'all' | 'tag' | 'csv';
    value?: string; // Tag name or CSV file URL
}

export type MessageType = 'text' | 'image' | 'video' | 'template';
export type CampaignProvider = 'official' | 'unofficial';

export interface Campaign {
    id: string;
    name: string;
    type: CampaignType;
    status: CampaignStatus;
    schedule_time?: string;
    recurrence_rule?: RecurrenceRule;
    audience_filter: any;
    created_at: string;
    last_run_at?: string;
    created_by: string;
    message_type: MessageType; // Currently unused in favor of template structure but kept for compat
    media_url?: string;
    daily_limit?: number;
    message_variations: string[]; // Still used for internal storage, but will store template name/body
    template_name?: string; // New field for reference
    template_language?: string; // New field for reference
    template_text?: string; // Storing the actual text of the template body
    provider: CampaignProvider;
}

export interface WhatsAppTemplate {
    name: string;
    status: string;
    language: string;
    category: string;
    components: {
        type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
        format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
        text?: string;
        buttons?: any[];
        example?: any;
    }[];
}

// WARNING: TOKENS SHOULD BE IN ENVIRONMENT VARIABLES
const META_ACCESS_TOKEN = 'EAAKmFZBwTLboBQGC0pf8fY2DaDXNTZCrPovqtM3oL9kLqG1jv5C9XZCpvLp1jbQMGsI9JW0Pdx5Sl2Alugiwwio27pTnGC ZBTmgOZB9Uc059XrJ9OQzVYzZCAhrhpTen3Wy6cnEZCN3ny5wXAcwgLDaTg5Y3yhSlIAVa7AP0KQoYml0n1T8EUoFUJF0fk2U2bPZCUwZDZD';
const META_ACCOUNT_ID = '1519441755961650';

export async function listMessageTemplates(): Promise<WhatsAppTemplate[]> {
    try {
        const response = await fetch(
            `https://graph.facebook.com/v21.0/${META_ACCOUNT_ID}/message_templates?fields=name,status,language,category,components&limit=50`,
            {
                headers: {
                    'Authorization': `Bearer ${META_ACCESS_TOKEN}`
                }
            }
        );

        if (!response.ok) {
            const error = await response.json();
            console.error('Meta API Error:', error);
            throw new Error(error.error?.message || 'Failed to fetch templates');
        }

        const data = await response.json();
        return data.data.filter((t: any) => t.status === 'APPROVED');
    } catch (error) {
        console.error('Error listing templates:', error);
        throw error;
    }
}

export async function createCampaign(campaign: Omit<Campaign, 'id' | 'created_at' | 'status' | 'created_by'>) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('User not authenticated');

    console.log('Creating campaign with payload:', campaign);

    const { data, error } = await supabase
        .from('campaigns')
        .insert([
            {
                name: campaign.name,
                type: campaign.type,
                schedule_time: campaign.schedule_time,
                recurrence_rule: campaign.recurrence_rule,
                audience_filter: campaign.audience_filter,
                message_type: campaign.message_type,
                media_url: campaign.media_url,
                daily_limit: campaign.daily_limit,
                message_variations: campaign.message_variations,
                template_name: campaign.template_name,
                template_language: campaign.template_language,
                template_text: campaign.template_text,
                provider: campaign.provider || 'official', // Default to official
                status: campaign.type === 'recurring' ? 'active' : 'pending', // Auto-activate recurring campaigns
                created_by: user.id
            }
        ])
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function listCampaigns() {
    const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Campaign[];
}

export async function deleteCampaign(id: string) {
    const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

export async function getCampaignStats(campaignId: string, startDate?: string, endDate?: string) {
    // 1. Fetch aggregated metrics for performance (only if no date filter is applied)
    // If date filter is applied, we must calculate from logs to be accurate for that period
    let metrics = null;
    if (!startDate && !endDate) {
        const { data, error } = await supabase
            .from('campaign_metrics')
            .select('*')
            .eq('campaign_id', campaignId)
            .maybeSingle();

        if (!error) metrics = data;
    }

    // 2. Fetch detailed logs using recursive pagination to get ALL records
    let allLogs: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
        let query = supabase
            .from('campaign_logs')
            .select('*')
            .eq('campaign_id', campaignId)
            .order('created_at', { ascending: false });

        if (startDate) {
            query = query.gte('created_at', startDate);
        }
        if (endDate) {
            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);
            query = query.lte('created_at', endDateTime.toISOString());
        }

        const { data, error } = await query.range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
            allLogs = [...allLogs, ...data];
            // If we got fewer than pageSize, we've reached the end
            if (data.length < pageSize) {
                hasMore = false;
            }
        } else {
            hasMore = false;
        }
        page++;

        // Safety break
        if (page > 100) break;
    }

    const logs = allLogs;

    // Calculate metrics from full logs
    const total = logs.length;
    const sent = logs.length;
    const delivered = logs.filter(l => l.status === 'success' || l.status === 'delivered').length;
    const failed = logs.filter(l => l.status === 'failed').length;

    // Calculate variation stats dynamically
    const variationStats: Record<string, any> = {};
    logs.forEach(log => {
        const key = log.message_content || 'default';
        if (!variationStats[key]) {
            variationStats[key] = { total: 0, delivered: 0, failed: 0 };
        }
        variationStats[key].total++;
        if (log.status === 'success' || log.status === 'delivered') variationStats[key].delivered++;
        if (log.status === 'failed') variationStats[key].failed++;
    });

    // Group by Day/Hour for "Timeline" (Activity Distribution)
    const timelineMap: Record<string, { time: string, sent: number, delivered: number, failed: number, timestamp: number }> = {};

    logs.forEach(curr => {
        const date = new Date(curr.created_at);
        // Format: DD/MM HH:00
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const hour = date.getHours().toString().padStart(2, '0');
        const key = `${day}/${month} ${hour}:00`;

        if (!timelineMap[key]) {
            timelineMap[key] = {
                time: key,
                sent: 0,
                delivered: 0,
                failed: 0,
                timestamp: date.setMinutes(0, 0, 0) // For sorting
            };
        }

        if (curr.status === 'success' || curr.status === 'delivered') {
            timelineMap[key].sent++;
            timelineMap[key].delivered++;
        }
        if (curr.status === 'failed') timelineMap[key].failed++;
    });

    const timelineDistribution = Object.values(timelineMap).sort((a, b) => a.timestamp - b.timestamp);

    // 3. Fetch campaign details to get message variations (fallback for logs without content)
    const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

    if (campaignError) throw campaignError;

    return {
        total,
        sent,
        delivered,
        failed,
        timelineDistribution,
        logs,
        variationStats,
        campaign // Return the full campaign object
    };
}

export async function updateCampaignStatus(id: string, status: CampaignStatus) {
    const { error } = await supabase
        .from('campaigns')
        .update({ status })
        .eq('id', id);

    if (error) throw error;
}

export async function getCampaign(id: string) {
    const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data as Campaign;
}

export async function updateCampaign(id: string, updates: Partial<Omit<Campaign, 'id' | 'created_at' | 'created_by'>>) {
    const { data, error } = await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function logCampaignError(
    campaignId: string,
    phone: string,
    errorMessage: string,
    contactId?: string,
    messageContent?: string
) {
    const { error } = await supabase
        .from('campaign_logs')
        .insert({
            campaign_id: campaignId,
            phone: phone,
            contact_id: contactId || null,
            status: 'failed',
            details: { error: errorMessage },
            message_content: messageContent,
            created_at: new Date().toISOString()
        });

    if (error) console.error('Erro ao logar falha:', error);
}

export async function logCampaignSuccess(
    campaignId: string,
    phone: string,
    contactId?: string,
    messageContent?: string
) {
    const { error } = await supabase
        .from('campaign_logs')
        .insert({
            campaign_id: campaignId,
            phone: phone,
            contact_id: contactId || null,
            status: 'success',
            message_content: messageContent,
            created_at: new Date().toISOString()
        });

    if (error) console.error('Erro ao logar sucesso:', error);
}

export async function getCampaignTargetAudience(campaignId: string, limit?: number) {
    // 1. Fetch campaign details to get audience filter and daily limit
    const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

    if (campaignError) throw campaignError;

    // 2. Fetch IDs of contacts who already received this campaign
    // We filter by 'success', 'sent', or 'delivered' to avoid re-sending
    const { data: existingLogs, error: logsError } = await supabase
        .from('campaign_logs')
        .select('contact_id')
        .eq('campaign_id', campaignId)
        .in('status', ['sent', 'delivered', 'success'])
        .not('contact_id', 'is', null);

    if (logsError) throw logsError;

    const excludedContactIds = existingLogs?.map(log => log.contact_id) || [];

    // 3. Build the query for contacts
    let query = supabase
        .from('contatos')
        .select('*');

    // Apply Audience Filter
    if (campaign.audience_filter?.type === 'tag' && campaign.audience_filter.value) {
        // Assuming 'tags' is a text array column in Postgres
        query = query.contains('tags', [campaign.audience_filter.value]);
    }
    // If type is 'all', we don't need an extra filter

    // Exclude contacts who already received it
    if (excludedContactIds.length > 0) {
        query = query.not('id', 'in', `(${excludedContactIds.join(',')})`);
    }

    // Apply Limit
    // Use the provided limit (e.g. for batching) OR the campaign's daily limit
    // If both are present, use the smaller one to be safe
    const campaignLimit = campaign.daily_limit;
    const effectiveLimit = limit && campaignLimit
        ? Math.min(limit, campaignLimit)
        : limit || campaignLimit;

    if (effectiveLimit) {
        query = query.limit(effectiveLimit);
    }

    const { data: contacts, error: contactsError } = await query;

    if (contactsError) throw contactsError;

    return contacts;
}
