import { User } from '../../database/entities/user.entity';
import { Document } from '../../database/entities/document.entity';
import {
  BlockchainTypes,
  DocumentStatuses,
  UserRoles,
} from '../enums/entities.enum';
import { ReadDocumentDto } from '../../documents/dto/read-document.dto';

const trustpilotBlock = `<table align="left" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="margin-bottom:9px">
                      <tbody style="width:100%">
                        <tr style="width:100%">
                          <p style="font-size:14px;line-height:20px;margin:0;color:#626C7F;font-weight:700;letter-spacing:0.28px">Enjoying DocuChain?</p>
                          <p style="font-size:14px;line-height:20px;margin:0;color:#626C7F;letter-spacing:0.28px">Your feedback helps us improve and helps others find us. <a href="https://www.trustpilot.com/review/docuchain.io" style="color:#626C7F;text-decoration:underline;white-space:nowrap" target="_blank">Leave a review on Trustpilot →</a></p>
                        </tr>
                      </tbody>
                    </table>`;

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getBlockchainExplorerUrl(
  blockchain: BlockchainTypes,
  hash: string,
): string {
  const explorerUrls = {
    [BlockchainTypes.POLYGON]: `https://polygonscan.com/tx/${hash}`,
    [BlockchainTypes.BSC]: `https://bscscan.com/tx/${hash}`,
    [BlockchainTypes.SOLANA]: `https://solscan.io/tx/${hash}`,
    [BlockchainTypes.MONAD]: `http://testnet.monadexplorer.com/tx/${hash}`,
    [BlockchainTypes.BASE]: `https://basescan.org/tx/${hash}`,
    [BlockchainTypes.BITCOIN]: `https://blockstream.info/tx/${hash}`,
    [BlockchainTypes.SEI]: `https://seiscan.io/tx/${hash}`,
  };

  return explorerUrls[blockchain];
}

export function generateEmailTemplate(
  document: ReadDocumentDto,
  user: User,
  token: string,
  signerName?: string,
  hash?: string,
  downloadLink?: string,
): { subject: string; preview: string; template: string } {
  const clientUrl = 'https://docuchain.io';
  const appUrl = 'https://docuchain.io/app';
  const logoUrl = 'https://docuchain.io/app/assets/logo.png';
  const imageLink = document.imageLink;
  const expiredAtTwoDays = Date.now() + 2 * 24 * 3600 * 1000;
  let reminder = `You have ${document.name} to review in DocuChain`;
  let actualStatus = 'in progress';
  let buttonText = 'Open document';
  let subject = 'New document to review';
  let preview = `You have ${document.name} to review in DocuChain`;
  let link = `${appUrl}/doc/sign/${document.id}?userId=${user.id}&token=${token}&expiredAt=${expiredAtTwoDays}`;
  let imageBackgroundStyle =
    'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 100%)';

  if (user.role === UserRoles.WATCHER) {
    subject = `Document tracking notification`;
    preview = `You have been assigned as a Watcher of ${document.name}`;
    link = `${appUrl}/doc/status/${document.id}?token=${token}&expiredAt=${expiredAtTwoDays}`;
    buttonText = 'View status';
    reminder = `You have been assigned to track document`;
  }

  if (document.status === DocumentStatuses.PARTIALLY_SIGNED && signerName) {
    subject = `Document signing update`;
    preview = `${signerName} has signed ${document.name}`;
    reminder = `${signerName} has signed the document: ${document.name}`;
  }

  if (
    document.status === DocumentStatuses.COMPLETED ||
    document.status === DocumentStatuses.BLOCKCHAINED
  ) {
    subject = `All signers completed`;
    preview = `🎉 All signers completed with ${document.name}`;
    link = `${appUrl}/doc/status/${document.id}?token=${token}&expiredAt=${expiredAtTwoDays}&success=true`;
    reminder = `🎉 All signers completed with <!-- -->${document.name}`;
    actualStatus = 'Completed';
    buttonText = 'View completed document';
    imageBackgroundStyle =
      'linear-gradient(rgba(245,253,241,0.5) 0%, rgba(245,253,241,1) 100%)';
  }

  const safeLink = escapeHtmlAttribute(link);

  const apiUrl = 'https://api.docuchain.io/v1';
  const reportLink = `${apiUrl}/documents/${document.id}/report?userId=${user.id}&token=${token}`;
  const safeReportLink = escapeHtmlAttribute(reportLink);
  const showReport =
    document.status !== DocumentStatuses.COMPLETED &&
    document.status !== DocumentStatuses.BLOCKCHAINED;
  const reportBlock = showReport
    ? `<table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="margin-bottom:20px">
                      <tbody style="width:100%">
                        <tr style="width:100%">
                          <td align="center" data-id="__react-email-column">
                            <p style="font-size:16px;line-height:24px;margin:0 0 12px 0;font-weight:600;color:#000;text-align:center">Unknown sender or document?<br />Report it to our team.</p>
                            <a href="${safeReportLink}" style="line-height:100%;text-decoration:none;display:inline-block;max-width:280px;width:280px;height:fit-content;padding:12px 24px;border-radius:8px;border:1px solid #EB8F8F;background:#EB8F8F;box-shadow:0px 1px 2px 0px rgba(16, 24, 40, 0.05);cursor:pointer" target="_blank"><span style="max-width:100%;display:inline-block;line-height:120%"><p style="font-size:16px;line-height:24px;margin:0;display:block;font-weight:600;width:100%;color:#000;letter-spacing:0.32px;text-align:center">Report message</p></span></a>
                          </td>
                        </tr>
                      </tbody>
                    </table>`
    : '';

  const signers = document.users
    .filter((user) => user.role === UserRoles.SIGNER)
    .map(
      (user, index) =>
        `<p style="font-size:14px;line-height:24px;margin:0;color:#000">${index + 1}. ${user.name} <a href="mailto:${user.email}" style="color:#067df7;text-decoration:none" target="_blank">(${user.email})</a>${user.isInitiator ? ' -initiator of signing' : ''}</p>`,
    )
    .join('');

  const watchers = document.users
    .filter((user) => user.role === UserRoles.WATCHER)
    .map(
      (user, index) =>
        `<p style="font-size:14px;line-height:24px;margin:0;color:#000">${index + 1}. ${user.name ?? ''} <a href="mailto:${user.email}" style="color:#067df7;text-decoration:none" target="_blank">${user.name ? `(${user.email})` : `${user.email}`}</a></p>`,
    )
    .join('');

  let watchersBlock = `<p style="font-size:14px;line-height:24px;margin:12px 0 0 0;font-weight:600;color:#000">Watchers</p>
  ${watchers}`;

  if (watchers.length === 0) {
    watchersBlock = '';
  }

  let hashBlock = '';
  const isDownloadButtonBlock = !!downloadLink;
  let downloadButtonBlock = '';

  if (hash && document.blockchain) {
    const explorerUrl = getBlockchainExplorerUrl(
      document.blockchain as BlockchainTypes,
      hash,
    );

    hashBlock = `<table align="left" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="margin-bottom:9px">
                      <tbody style="width:100%">
                        <tr style="width:100%">
                          <p style="font-size:14px;line-height:20px;margin:0;color:#626C7F;font-weight:700;letter-spacing:0.28px">The document hash: <a href=${explorerUrl} style="color:#067df7;text-decoration:underline;text-decoration-color: #626C7F" target="_blank"><span style="word-break:break-all;line-height:20px;margin:0;color:#626C7F;font-size:14px;font-weight:700;letter-spacing:0.28px">${hash}</a></p>
                          <p style="font-size:14px;line-height:20px;margin:0;color:#626C7F;letter-spacing:0.28px">Your document is securely stored on the blockchain forever and fully protected. You can always check if it has changed since signing.</p>
                        </tr>
                      </tbody>
                    </table>`;
  }

  if (isDownloadButtonBlock) {
    downloadButtonBlock = `  <table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation">
                      <tbody style="width:100%">
                        <tr style="width:100%">
                          <td align="center" valign="bottom" data-id="__react-email-column"><a href="${safeLink}" style="line-height:100%;text-decoration:none;display:block;max-width:230px;width:230px;max-height:44px;height:fit-content;padding:10px 24px 10px 24px;border-radius:6px;border:1px solid #9FE870;background:#9FE870;box-shadow:0px 1px 2px 0px rgba(16, 24, 40, 0.05);cursor:pointer;margin-bottom:24px" target="_blank"><span><!--[if mso]><i style="letter-spacing: 24px;mso-font-width:-100%;mso-text-raise:15" hidden>&nbsp;</i><![endif]--></span><span style="max-width:100%;display:inline-block;line-height:120%;mso-padding-alt:0px;mso-text-raise:7.5px"><p style="font-size:16px;line-height:24px;margin:0;display:block;font-weight:600;width:100%;color:#000;letter-spacing:0.32px;white-space:nowrap">Download document<span style="margin-left:6px;text-decoration:underline;display:inline-block">↓</span></p></span><span><!--[if mso]><i style="letter-spacing: 24px;mso-font-width:-100%" hidden>&nbsp;</i><![endif]--></span></a></td>
                        </tr>
                      </tbody>
                    </table>`;
  }

  return {
    subject: subject,
    preview: preview,
    template: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html style="font-family:Inter;background-color:#F6F9FC" dir="ltr" lang="en">
  <head>
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <style>
      @font-face {
        font-family: 'Inter';
        font-style: normal;
        font-weight: 400;
        mso-font-alt: 'Helvetica';
        src: url(https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa2JL7W0Q5n-wU.woff2) format('woff2');
      }
      * {
        font-family: 'Inter', Helvetica;
      }
    </style>
  </head>
  <body style="background-color:#F6F9FC">
    <div style="display: none; max-height: 0px; overflow: hidden;">
      ${preview}
    </div>
    <div style="display: none; max-height: 0px; overflow: hidden;">
      &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy;&#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy;      &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy;&#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy;      &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy;&#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy;
    </div>
    <table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="max-width:37.5em">
      <tbody>
        <tr style="width:100%">
          <td>
            <table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="margin:40px auto 12px;display:flex;max-width:600px;width:100%;min-width:300px;height:100%;-text-align:left;-white-space:pre-wrap;background-color:#FFFFFF;border:1px solid #D0D5DD;border-radius:16px;padding:20px 24px 20px">
              <tbody>
                <tr>
                  <td>
                    <table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="width:100%;margin:18px 0">
                      <tbody>
                        <tr>
                          <td>
                          <td align="left" width="150" data-id="__react-email-column"><a href=${clientUrl} style="color:#067df7;text-decoration:none" target="_blank"><img alt="" src="${logoUrl}" style="display:block;outline:none;border:none;text-decoration:none" width="151" /></a></td>
                          <td align="right" width="450" data-id="__react-email-column">
                            <p style="font-size:14px;line-height:24px;margin:0;color:#626C7F">ID: <!-- -->${document.shortId.toUpperCase()}<!-- --> (${actualStatus})</p>
                          </td>
                  </td>
                </tr>
              </tbody>
            </table>
            <hr style="width:100%;border:none;border-top:1px solid #eaeaea;margin:0 0 20px 0" />
            <table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation">
              <tbody>
                <tr>
                  <td>
                      <table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="width:100%;min-width:280px;height:330px;min-height:330px;margin:0;border:1px solid #D0D5DD;border-radius:12px;overflow:hidden;background-size:cover;position:relative;background-image:${imageBackgroundStyle},
            url(${imageLink})">
                        <tbody style="width:100%">
                          <tr style="width:100%">
                            <td height="330" align="center" valign="bottom" data-id="__react-email-column"><a href="${safeLink}" style="line-height:100%;text-decoration:none;display:inline-block;max-width:230px;width:230px;max-height:44px;height:fit-content;padding:10px 24px 10px 24px;border-radius:8px;border:1px solid #9FE870;background:#9FE870;box-shadow:0px 1px 2px 0px rgba(16, 24, 40, 0.05);cursor:pointer;margin-bottom:24px" target="_blank"><span><!--[if mso]><i style="letter-spacing: 24px;mso-font-width:-100%;mso-text-raise:15" hidden>&nbsp;</i><![endif]--></span><span style="max-width:100%;display:inline-block;line-height:120%;mso-padding-alt:0px;mso-text-raise:7.5px"><p style="font-size:16px;line-height:24px;margin:0;display:block;font-weight:600;width:100%;color:#000;letter-spacing:0.32px;white-space:nowrap">${buttonText}<span style="margin-left:6px">→</span></p></span><span><!--[if mso]><i style="letter-spacing: 24px;mso-font-width:-100%" hidden>&nbsp;</i><![endif]--></span></a></td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                </tr>
              </tbody>
            </table>
            <table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation">
              <tbody style="width:100%">
                <tr style="width:100%">
                  <p style="font-size:20px;line-height:27px;margin:20px 0 0 0;font-weight:600;color:#000">${reminder}</p>
                </tr>
              </tbody>
            </table>
            <table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation">
              <tbody style="width:100%">
                <tr style="width:100%">
                  <p style="font-size:14px;line-height:24px;margin:12px 0 0 0;font-weight:600;color:#000">Signers</p>
                  ${signers}
                  ${watchersBlock}
                </tr>
              </tbody>
            </table>
            <hr style="width:100%;border:none;border-top:1px solid #eaeaea;margin-top:20px;margin-bottom:20px" />
            <table align="left" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="width:100%">
              <tbody>
                <tr>
                  <td>
                  ${reportBlock}
                  ${hashBlock}
                    <table align="left" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="margin-bottom:9px">
                      <tbody style="width:100%">
                        <tr style="width:100%">
                          <p style="font-size:14px;line-height:20px;margin:0;color:#626C7F;font-weight:700;letter-spacing:0.28px">❗Do Not Share This Email</p>
                          <p style="font-size:14px;line-height:20px;margin:0;color:#626C7F;letter-spacing:0.28px">This email contains a secure link to DocuChain. Please do not share this email, link, or access code with others.</p>
                        </tr>
                      </tbody>
                    </table>
                    <table align="left" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="margin-bottom:9px">
                      <tbody style="width:100%">
                        <tr style="width:100%">
                          <p style="font-size:14px;line-height:20px;margin:0;color:#626C7F;font-weight:700;letter-spacing:0.28px">About DocuChain</p>
                          <p style="font-size:14px;line-height:20px;margin:0;color:#626C7F;letter-spacing:0.28px">Quick digital signing of documents. Signing documents with DocuChain is legally binding and complies with business practices in security and safety.<!-- --> <a href=${clientUrl} style="color:#626C7F;text-decoration:underline;line-height:20px;margin:0;letter-spacing:0.28px;white-space:nowrap" target="_blank">More →</a></p>
                        </tr>
                      </tbody>
                    </table>
                    <table align="left" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="margin-bottom:9px">
                      <tbody style="width:100%">
                        <tr style="width:100%">
                          <p style="font-size:14px;line-height:20px;margin:0;color:#626C7F;font-weight:700;letter-spacing:0.28px">Questions about the Document?</p>
                          <p style="font-size:14px;line-height:20px;margin:0;color:#626C7F;letter-spacing:0.28px">If you need to modify the document or have questions about the details in the document, please reach out to the document's creator by emailing them directly.</p>
                        </tr>
                      </tbody>
                    </table>
                    ${trustpilotBlock}
                    ${downloadButtonBlock}
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
    <table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation">
      <tbody style="width:100%">
        <tr style="width:100%">
          <td align="center" data-id="__react-email-column">
            <p style="font-size:14px;line-height:24px;margin:0 0 32px 0;color:#626C7F"><a href=${clientUrl} style="color:#626C7F;text-decoration:underline" target="_blank">DocuChain.io</a></p>
          </td>
        </tr>
      </tbody>
    </table>
    </td>
    </tr>
    </tbody>
    </table>
  </body>
</html>`,
  };
}

export function generateSignReminderEmail(
  document: Document,
  token: string,
  pendingSigners: User[],
): { subject: string; preview: string; template: string } {
  const clientUrl = 'https://docuchain.io';
  const appUrl = 'https://docuchain.io/app';
  const logoUrl = 'https://docuchain.io/app/assets/logo.png';
  const unsubscribeUrl = 'https://docuchain.io/unsubscribe';
  const expiredAtTwoDays = Date.now() + 2 * 24 * 3600 * 1000;
  const link = `${appUrl}/doc/status/${document.id}?token=${token}&expiredAt=${expiredAtTwoDays}`;
  const safeLink = escapeHtmlAttribute(link);

  const signersCount = document.users.filter(
    (user) => user.role === UserRoles.SIGNER,
  ).length;
  const signedCount = signersCount - pendingSigners.length;

  const subject = 'Document signing reminder';
  const preview = `${document.name} is still waiting for signatures`;

  const pendingList = pendingSigners
    .map(
      (user, index) =>
        `<p style="font-size:14px;line-height:24px;margin:0;color:#000">${index + 1}. ${user.name} <a href="mailto:${user.email}" style="color:#067df7;text-decoration:none" target="_blank">(${user.email})</a></p>`,
    )
    .join('');

  return {
    subject,
    preview,
    template: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html style="font-family:Inter;background-color:#F6F9FC" dir="ltr" lang="en">
  <head>
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <style>
      @font-face {
        font-family: 'Inter';
        font-style: normal;
        font-weight: 400;
        mso-font-alt: 'Helvetica';
        src: url(https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa2JL7W0Q5n-wU.woff2) format('woff2');
      }
      * {
        font-family: 'Inter', Helvetica;
      }
    </style>
  </head>
  <body style="background-color:#F6F9FC">
    <div style="display: none; max-height: 0px; overflow: hidden;">
      ${preview}
    </div>
    <table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="max-width:37.5em">
      <tbody>
        <tr style="width:100%">
          <td>
            <table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="margin:40px auto 12px;max-width:600px;width:100%;min-width:300px;background-color:#FFFFFF;border:1px solid #D0D5DD;border-radius:16px;padding:20px 24px 20px">
              <tbody>
                <tr>
                  <td>
                    <table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="width:100%;margin:18px 0">
                      <tbody>
                        <tr>
                          <td align="left" width="150" data-id="__react-email-column"><a href=${clientUrl} style="color:#067df7;text-decoration:none" target="_blank"><img alt="" src="${logoUrl}" style="display:block;outline:none;border:none;text-decoration:none" width="151" /></a></td>
                          <td align="right" width="450" data-id="__react-email-column">
                            <p style="font-size:14px;line-height:24px;margin:0;color:#626C7F">ID: <!-- -->${document.shortId.toUpperCase()}<!-- --> (in progress)</p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <hr style="width:100%;border:none;border-top:1px solid #eaeaea;margin:0 0 20px 0" />
                    <p style="font-size:20px;line-height:27px;margin:0 0 8px 0;font-weight:600;color:#000">${document.name} is still waiting for signatures</p>
                    <p style="font-size:14px;line-height:24px;margin:0;color:#626C7F">${signedCount} of ${signersCount} signers have signed so far. Waiting for:</p>
                    ${pendingList}
                    <table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="margin:24px 0 8px 0">
                      <tbody style="width:100%">
                        <tr style="width:100%">
                          <td align="center" data-id="__react-email-column"><a href="${safeLink}" style="line-height:100%;text-decoration:none;display:inline-block;max-width:230px;width:230px;max-height:44px;height:fit-content;padding:10px 24px 10px 24px;border-radius:8px;border:1px solid #9FE870;background:#9FE870;box-shadow:0px 1px 2px 0px rgba(16, 24, 40, 0.05);cursor:pointer" target="_blank"><span style="max-width:100%;display:inline-block;line-height:120%"><p style="font-size:16px;line-height:24px;margin:0;display:block;font-weight:600;width:100%;color:#000;letter-spacing:0.32px;white-space:nowrap">View status &amp; remind<span style="margin-left:6px">→</span></p></span></a></td>
                        </tr>
                      </tbody>
                    </table>
                    <hr style="width:100%;border:none;border-top:1px solid #eaeaea;margin-top:20px;margin-bottom:20px" />
                    <table align="left" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="margin-bottom:9px">
                      <tbody style="width:100%">
                        <tr style="width:100%">
                          <p style="font-size:14px;line-height:20px;margin:0;color:#626C7F;font-weight:700;letter-spacing:0.28px">❗Do Not Share This Email</p>
                          <p style="font-size:14px;line-height:20px;margin:0;color:#626C7F;letter-spacing:0.28px">This email contains a secure link to DocuChain. Please do not share this email, link, or access code with others.</p>
                        </tr>
                      </tbody>
                    </table>
                    ${trustpilotBlock}
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
    <table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation">
      <tbody style="width:100%">
        <tr style="width:100%">
          <td align="center" data-id="__react-email-column">
            <p style="font-size:14px;line-height:24px;margin:0 0 6px 0;color:#626C7F"><a href=${clientUrl} style="color:#626C7F;text-decoration:underline" target="_blank">DocuChain.io</a></p>
            <p style="font-size:12px;line-height:18px;margin:0 0 32px 0;color:#98A2B3">You're getting these reminders because you sent this document for signing. <a href="${unsubscribeUrl}" style="color:#98A2B3;text-decoration:underline" target="_blank">Unsubscribe from reminders</a></p>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>`,
  };
}

export function generateVerificationCodeEmail(code: string): {
  subject: string;
  template: string;
} {
  const clientUrl = 'https://docuchain.io';
  const logoUrl = 'https://docuchain.io/app/assets/logo.png';
  const subject = 'Your DocuChain verification code';

  return {
    subject,
    template: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html style="font-family:Inter;background-color:#F6F9FC" dir="ltr" lang="en">
  <head>
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <style>
      @font-face {
        font-family: 'Inter';
        font-style: normal;
        font-weight: 400;
        mso-font-alt: 'Helvetica';
        src: url(https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa2JL7W0Q5n-wU.woff2) format('woff2');
      }
      * {
        font-family: 'Inter', Helvetica;
      }
    </style>
  </head>
  <body style="background-color:#F6F9FC">
    <div style="display: none; max-height: 0px; overflow: hidden;">
      Your DocuChain verification code is ${code}
    </div>
    <table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="max-width:37.5em">
      <tbody>
        <tr style="width:100%">
          <td>
            <table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="margin:40px auto 12px;max-width:600px;width:100%;min-width:300px;background-color:#FFFFFF;border:1px solid #D0D5DD;border-radius:16px;padding:20px 24px 20px">
              <tbody>
                <tr>
                  <td>
                    <table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="width:100%;margin:18px 0">
                      <tbody>
                        <tr>
                          <td align="left" width="150" data-id="__react-email-column"><a href=${clientUrl} style="color:#067df7;text-decoration:none" target="_blank"><img alt="" src="${logoUrl}" style="display:block;outline:none;border:none;text-decoration:none" width="151" /></a></td>
                        </tr>
                      </tbody>
                    </table>
                    <hr style="width:100%;border:none;border-top:1px solid #eaeaea;margin:0 0 20px 0" />
                    <p style="font-size:20px;line-height:27px;margin:0 0 8px 0;font-weight:600;color:#000">Verify your email</p>
                    <p style="font-size:14px;line-height:24px;margin:0 0 20px 0;color:#626C7F">Use the code below to confirm your email address.</p>
                    <table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="margin:0 0 16px 0">
                      <tbody style="width:100%">
                        <tr style="width:100%">
                          <td align="center" data-id="__react-email-column">
                            <p style="font-size:40px;line-height:48px;margin:0;font-weight:700;letter-spacing:10px;color:#000">${code}</p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <p style="font-size:14px;line-height:20px;margin:0;color:#626C7F;letter-spacing:0.28px">This code expires in 2 minutes. If you didn't request it, you can safely ignore this email.</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
    <table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation">
      <tbody style="width:100%">
        <tr style="width:100%">
          <td align="center" data-id="__react-email-column">
            <p style="font-size:14px;line-height:24px;margin:0 0 32px 0;color:#626C7F"><a href=${clientUrl} style="color:#626C7F;text-decoration:underline" target="_blank">DocuChain.io</a></p>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>`,
  };
}
