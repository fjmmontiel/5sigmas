"""Retry terminal failed transfer with a new envelope and redacted network diagnostics."""
import hashlib,json,re
from urllib.error import HTTPError,URLError
import archive_receive as receiver
original_git=receiver.git
original_build_opener=receiver.build_opener

def git(*args,**kwargs):
    args=tuple('FETCH_HEAD:.release-media/archive-input-v2.json' if x=='FETCH_HEAD:.release-media/archive-input.json' else x for x in args)
    return original_git(*args,**kwargs)

class Response:
    def __init__(self, raw):
        self.raw=raw;self.status=raw.status;self.total=0;self.hash=hashlib.sha256()
    def __enter__(self):return self
    def __exit__(self,*args):self.raw.close()
    def read(self,n):
        data=self.raw.read(n);self.total+=len(data);self.hash.update(data)
        if not data:print('TRANSFER_BODY',json.dumps({'bytes':self.total,'sha256':self.hash.hexdigest()}),flush=True)
        return data

class Opener:
    def __init__(self, handlers):self.opener=original_build_opener(*handlers)
    def open(self,req,timeout):
        try:
            response=self.opener.open(req,timeout=timeout)
            print('TRANSFER_RESPONSE',json.dumps({'status':response.status,'length':response.headers.get('Content-Length'),'type':response.headers.get('Content-Type')}),flush=True)
            return Response(response)
        except HTTPError as error:
            body=error.read(8192).decode('utf8',errors='replace')
            code=re.search(r'<Code>([A-Za-z0-9_-]+)</Code>',body)
            print('TRANSFER_HTTP_ERROR',json.dumps({'status':error.code,'provider_code':code.group(1) if code else None,'body_sha256':hashlib.sha256(body.encode()).hexdigest()}),flush=True)
            raise RuntimeError('REDACTED_HTTP_TRANSFER_ERROR') from None
        except URLError as error:
            print('TRANSFER_NETWORK_ERROR',type(error.reason).__name__,flush=True)
            raise RuntimeError('REDACTED_NETWORK_TRANSFER_ERROR') from None

def build_opener(*handlers):return Opener(handlers)
receiver.git=git
receiver.build_opener=build_opener
receiver.main()
