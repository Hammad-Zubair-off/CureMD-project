import pkg from 'agora-access-token';
const { RtcTokenBuilder, RtcRole } = pkg;

export const generateRtcToken = (channelName, uid, role = 'publisher') => {
    const appId          = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;

    if (!appId || !appCertificate) {
        throw new Error('AGORA_APP_ID and AGORA_APP_CERTIFICATE must be set in env');
    }

    const agoraRole          = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
    const privilegeExpiredTs = Math.floor(Date.now() / 1000) + 3600;

    return RtcTokenBuilder.buildTokenWithUid(
        appId,
        appCertificate,
        channelName,
        uid,
        agoraRole,
        privilegeExpiredTs
    );
};